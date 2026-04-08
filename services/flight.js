const BASE_URL = "https://api.duffel.com";
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

async function nearestAirport(lat, lng, radius = 50000) {
  const url = `${BASE_URL}/places/suggestions?lat=${lat}&lng=${lng}&rad=${radius}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();

  if (json.errors || !json.data) {
    console.error("[Duffel Error]:", json.errors);
    return null;
  }

  // Find the first result that is an airport and has an IATA code
  const airport = json.data.find(
    (place) => place.type === "airport" && place.iata_code,
  );

  if (airport) {
    return airport.iata_code;
  }

  // Fallback: If no airport found, check if there's a city with an IATA code
  const city = json.data.find(
    (place) => place.type === "city" && place.iata_code,
  );
  return city ? city.iata_code : null;
}

async function search(
  originLat,
  originLng,
  destLat,
  destLng,
  departureDate,
  returnDate,
  packageType,
  tripType,
  radius = 50000, // default radius 50km
) {
  try {
    const originIATA = await nearestAirport(
      Number(originLat),
      Number(originLng),
      radius,
    );
    const destIATA = await nearestAirport(Number(destLat), Number(destLng));

    if (!originIATA || !destIATA) return [];

    const bodySlices = [
      {
        origin: originIATA,
        destination: destIATA,
        departure_date: departureDate,
      },
    ];

    if (tripType === "round") {
      if (!returnDate) return [];
      bodySlices.push({
        origin: destIATA,
        destination: originIATA,
        departure_date: returnDate,
      });
    }

    const response = await fetch(
      `${BASE_URL}/air/offer_requests?return_offers=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            selected_offers_currency: "USD",
            slices: bodySlices,
            passengers: [{ type: "adult" }],
            cabin_class: packageType === "gold" ? "business" : "economy",
          },
        }),
      },
    );

    const json = await response.json();

    if (json.errors || !json.data?.offers) return [];

    const offers = json.data.offers;
    if (offers.length === 0) return [];

    // ✅ Helpers
    const parseISODurationToMinutes = (iso) => {
      const days = Number(iso.match(/(\d+)D/)?.[1] || 0);
      const hours = Number(iso.match(/(\d+)H/)?.[1] || 0);
      const minutes = Number(iso.match(/(\d+)M/)?.[1] || 0);
      return days * 24 * 60 + hours * 60 + minutes;
    };

    const getTotalDurationMinutes = (offer) =>
      offer.slices.reduce(
        (sum, s) => sum + parseISODurationToMinutes(s.duration),
        0,
      );

    const getTotalStops = (offer) =>
      offer.slices.reduce((sum, s) => sum + (s.segments.length - 1), 0);

    const formatMinutes = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    };

    // ✅ 3 DIFFERENT OFFERS

    // 🟢 BEST
    const bestOffer = [...offers].sort((a, b) => {
      const stopsA = getTotalStops(a);
      const stopsB = getTotalStops(b);

      const durationA = getTotalDurationMinutes(a);
      const durationB = getTotalDurationMinutes(b);

      if (stopsA !== stopsB) return stopsA - stopsB;
      if (durationA !== durationB) return durationA - durationB;
      return Number(a.total_amount) - Number(b.total_amount);
    })[0];

    // ⚡ FASTEST
    const fastestOffer = [...offers].sort(
      (a, b) => getTotalDurationMinutes(a) - getTotalDurationMinutes(b),
    )[0];

    // 💰 CHEAPEST
    const cheapestOffer = [...offers].sort(
      (a, b) => Number(a.total_amount) - Number(b.total_amount),
    )[0];

    // ✅ Deduplicate
    const uniqueMap = new Map();
    [
      { offer: bestOffer, tag: "best" },
      { offer: fastestOffer, tag: "fastest" },
      { offer: cheapestOffer, tag: "cheapest" },
    ].forEach(({ offer, tag }) => {
      if (offer && !uniqueMap.has(offer.id)) {
        uniqueMap.set(offer.id, { offer, tag });
      }
    });

    let selected = Array.from(uniqueMap.values());

    // ✅ Fill if less than 3
    if (selected.length < 3) {
      const remaining = offers.filter(
        (o) => !selected.find((s) => s.offer.id === o.id),
      );

      remaining
        .sort((a, b) => Number(a.total_amount) - Number(b.total_amount))
        .slice(0, 3 - selected.length)
        .forEach((o) => {
          selected.push({ offer: o, tag: "extra" });
        });
    }

    // ✅ Map result
    const results = selected.map(({ offer, tag }) => {
      const totalDurationMinutes = getTotalDurationMinutes(offer);

      const slices = offer.slices.map((slice) => {
        const segments = slice.segments;

        return {
          departureTime: segments[0].departing_at,
          arrivalTime: segments[segments.length - 1].arriving_at,
          duration: formatMinutes(parseISODurationToMinutes(slice.duration)),

          originIata: segments[0].origin.iata_code,
          destinationIata: segments[segments.length - 1].destination.iata_code,

          flightNumbers: segments.map(
            (s) =>
              `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`,
          ),

          stops: segments.slice(0, -1).map((segment, i) => {
            const next = segments[i + 1];

            const diffMs =
              new Date(next.departing_at) - new Date(segment.arriving_at);

            const h = Math.floor(diffMs / (1000 * 60 * 60));
            const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
              iataCode: segment.destination.iata_code,
              arrivalTime: segment.arriving_at,
              departureTime: next.departing_at,
              duration: `${h}h ${m}m`,
            };
          }),
        };
      });

      const first = offer.slices[0].segments[0];
      const lastSlice = offer.slices[offer.slices.length - 1];
      const last = lastSlice.segments[lastSlice.segments.length - 1];

      return {
        id: offer.id,
        tag, // ⭐ important for UI
        airlineName: offer.owner.name,
        airlineLogo: offer.owner.logo_symbol_url,
        totalAmount: offer.total_amount,
        currency: offer.total_currency,
        passengerIds: json.data.passengers.map((p) => p.id),

        duration: formatMinutes(totalDurationMinutes),

        slices,
        tripType: offer.slices.length > 1 ? "round" : "oneWay",
        departureTime: first.departing_at,
        arrivalTime: last.arriving_at,

        converted: {
          totalAmount: 0,
          currency: "EUR",
        },
      };
    });

    return results;
  } catch (err) {
    console.log("[duffel search flights error]: ", err);
    return [];
  }
}

async function book({ offerId, passengers, totalAmount, currency = "EUR" }) {
  try {
    const payment = {
      type: "balance",
      amount: totalAmount,
      currency: currency,
    };

    const response = await fetch(`${BASE_URL}/air/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "instant",
          selected_offers: [offerId],
          passengers: passengers,
          payments: [payment],
        },
      }),
    });

    const json = await response.json();

    console.log("booking flight result: ", json);

    if (!json.data?.id) {
      return {
        status: "failed",
        message: json.errors[0].message,
      };
    }

    if (response.ok) {
      return {
        status: "confirmed",
        id: json.data.id,
        reference: json.data.booking_reference,
        message: "Flight booked successfully!",
      };
    }

    return {
      status: "failed",
      message: json.errors[0].message,
    };
  } catch (err) {
    console.error("[flight book error]: ", err);
    return {
      status: "failed",
      message: json.errors[0].message,
    };
  }
}

module.exports = { search, book };
