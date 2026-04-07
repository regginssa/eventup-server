const BASE_URL = "https://api.duffel.com";
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

const formatDuration = (isoDuration) => {
  const hours = isoDuration.match(/(\d+)H/)?.[1] || 0;
  const minutes = isoDuration.match(/(\d+)M/)?.[1] || 0;
  return `${hours}h ${minutes}m`;
};

const getTotalDurationMinutes = (offer) => {
  return offer.slices.reduce((total, slice) => {
    const hours = slice.duration.match(/(\d+)H/)?.[1] || 0;
    const minutes = slice.duration.match(/(\d+)M/)?.[1] || 0;
    return total + Number(hours) * 60 + Number(minutes);
  }, 0);
};

const getTotalStops = (offer) => {
  return offer.slices.reduce((total, slice) => {
    return total + (slice.segments.length - 1);
  }, 0);
};

async function nearestAirport(lat, lng) {
  const url = `${BASE_URL}/places/suggestions?lat=${lat}&lng=${lng}&rad=50000`; // Increased radius to 50km

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
) {
  try {
    // 1. Get IATA codes from Coordinates
    const originIATA = await nearestAirport(
      Number(originLat),
      Number(originLng),
    );
    const destIATA = await nearestAirport(Number(destLat), Number(destLng));

    if (!originIATA || !destIATA) {
      console.log("Airports not found for coords:", { originLat, originLng });
      return null;
    }

    const bodySlices = [
      {
        origin: originIATA,
        destination: destIATA,
        departure_date: departureDate,
      },
    ];

    if (tripType === "round") {
      if (!returnDate) {
        return null;
      }
      bodySlices.push({
        origin: destIATA,
        destination: originIATA,
        departure_date: returnDate,
      });
    }

    // 2. Search Flights
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

    // Check if the API returned an error or if data.offers doesn't exist
    if (json.errors || !json.data || !json.data.offers) {
      console.log(
        "[Duffel API Error Response]:",
        JSON.stringify(json.errors || json),
      );
      return [];
    }

    const offers = json.data.offers;
    if (offers.length === 0) {
      return [];
    }

    const sortedOffers = json.data.offers.sort((a, b) => {
      const durationA = getTotalDurationMinutes(a);
      const durationB = getTotalDurationMinutes(b);

      const stopsA = getTotalStops(a);
      const stopsB = getTotalStops(b);

      // 1. Fewer stops first
      if (stopsA !== stopsB) {
        return stopsA - stopsB;
      }

      // 2. Shorter duration
      if (durationA !== durationB) {
        return durationA - durationB;
      }

      return Number(a.total_amount) - Number(b.total_amount);
    });

    const topOffers = sortedOffers.slice(0, 3);

    const results = topOffers.map((offer) => {
      const slices = offer.slices.map((slice) => {
        const segments = slice.segments;

        return {
          departureTime: segments[0].departing_at,
          arrivalTime: segments[segments.length - 1].arriving_at,
          duration: formatDuration(slice.duration),

          originIata: segments[0].origin.iata_code,
          destinationIata: segments[segments.length - 1].destination.iata_code,

          flightNumbers: segments.map(
            (s) =>
              `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`,
          ),

          stops: segments.slice(0, -1).map((segment, index) => {
            const nextSegment = segments[index + 1];

            const arrival = new Date(segment.arriving_at);
            const departure = new Date(nextSegment.departing_at);

            const diffMs = departure.getTime() - arrival.getTime();

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor(
              (diffMs % (1000 * 60 * 60)) / (1000 * 60),
            );

            return {
              iataCode: segment.destination.iata_code,
              arrivalTime: segment.arriving_at,
              departureTime: nextSegment.departing_at,
              duration: `${hours}h ${minutes}m`,
            };
          }),
        };
      });

      const outbound = offer.slices[0];
      const outboundSegments = outbound.segments;

      const departureTime = outboundSegments[0].departing_at;
      const arrivalTime =
        outboundSegments[outboundSegments.length - 1].arriving_at;

      return {
        id: offer.id,
        airlineName: offer.owner.name,
        airlineLogo: offer.owner.logo_symbol_url,
        totalAmount: offer.total_amount,
        currency: offer.total_currency,
        passengerIds: json.data.passengers.map((p) => p.id),
        slices,
        tripType: offer.slices.length > 1 ? "round" : "oneWay",
        departureTime,
        arrivalTime,
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
