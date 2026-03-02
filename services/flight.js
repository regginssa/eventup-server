const BASE_URL = process.env.DUFFEL_BASE_URL;
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

const formatDuration = (isoDuration) => {
  const hours = isoDuration.match(/(\d+)H/)?.[1] || 0;
  const minutes = isoDuration.match(/(\d+)M/)?.[1] || 0;
  return `${hours}h ${minutes}m`;
};

async function nearestAirport(lat, lng) {
  const url = `${BASE_URL}/places/suggestions?lat=${lat}&lng=${lng}&rad=20000`; // Increased radius to 20km

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
  packageType,
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
      return [];
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
            slices: [
              {
                origin: originIATA,
                destination: destIATA,
                departure_date: departureDate,
              },
            ],
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

    const offer = json.data.offers[0];

    const slice = offer.slices[0];
    const segments = slice.segments;

    return {
      id: offer.id,
      airlineName: offer.owner.name,
      airlineLogo: offer.owner.logo_symbol_url,
      totalAmount: offer.total_amount,
      currency: offer.total_currency,
      departureTime: segments[0].departing_at,
      arrivalTime: segments[segments.length - 1].arriving_at,
      duration: formatDuration(slice.duration),
      originIata: segments[0].origin.iata_code,
      destinationIata: segments[segments.length - 1].destination.iata_code,
      flightNumbers: segments.map(
        (s) =>
          `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`,
      ),
      // Changed the key to stopDetails to match common interface naming
      // but keeping your logic for mapping the connections
      stops: segments.slice(0, -1).map((segment, index) => {
        const nextSegment = segments[index + 1];

        const arrival = new Date(segment.arriving_at);
        const departure = new Date(nextSegment.departing_at);
        const diffMs = departure.getTime() - arrival.getTime();

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          iataCode: segment.destination.iata_code,
          arrivalTime: segment.arriving_at,
          departureTime: nextSegment.departing_at,
          duration: `${hours}h ${minutes}m`,
        };
      }),
    };
  } catch (err) {
    console.log("[duffel search flights error]: ", err);
    return null;
  }
}

async function book(offerId, passengers, payment) {
  const response = await fetch(`${BASE_URL}/air/orders`, {
    method: "POST",
    headers: HEADERS,
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

  if (response.ok) {
    return {
      status: "confirmed",
      orderId: json.data.id,
      bookingReference: json.data.booking_reference,
      message: "Flight booked successfully!",
    };
  }

  return {
    status: "failed",
    message: json.errors[0].message,
  };
}

module.exports = { search, book };
