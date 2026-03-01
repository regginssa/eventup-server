const BASE_URL = process.env.DUFFEL_BASE_URL;
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

async function nearestAirport(lat, lng) {
  const response = await fetch(
    `${BASE_URL}/air/places/suggestions?lat=${lat}&lng=${lng}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Duffel-Version": "v2",
      },
    },
  );

  const result = await response.json();

  // Filter for 'airport' types and return the IATA code of the first one
  const airport = result.data.find((place) => place.type === "airport");
  return airport ? airport.iata_code : null;
}

async function search(
  originLat,
  originLng,
  destLat,
  destLng,
  departureDate,
  packageType,
) {
  // 1. Get IATA codes from Coordinates
  const originIATA = await nearestAirport(originLat, originLng);
  const destIATA = await nearestAirport(destLat, destLng);

  if (!originIATA || !destIATA)
    throw new Error("Could not find nearby airports.");

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

  const searchData = await response.json();

  // Return exactly 10 offers
  return searchData.data.offers.slice(0, 10).map((offer) => ({
    id: offer.id,
    airlineName: offer.owner.name,
    airlineLogo: offer.owner.logo_symbol_url,
    totalAmount: offer.total_amount,
    currency: offer.total_currency,
    departureTime: offer.slices[0].segments[0].departing_at,
    arrivalTime: offer.slices[0].segments[0].arriving_at,
    duration: offer.slices[0].duration,
    originIata: origin,
    destinationIata: destination,
    packageType:
      offer.passenger_costs[0].cabin_class === "economy" ? "Standard" : "Gold",
  }));
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
