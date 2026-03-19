const BASE_URL = "https://api.staging.suntransfers.biz/v1";

let cachedToken = null;
let tokenExpiry = null;

function filterByPackage(vehicleName, packageType) {
  const name = vehicleName.toLowerCase();

  if (packageType === "standard") {
    return !name.includes("luxury") && !name.includes("premium");
  }

  if (packageType === "gold") {
    return name.includes("luxury") || name.includes("premium");
  }

  return true;
}

function buildLocation(type, code, lat, lng) {
  if (type === "airport") {
    return `iata:${code}`;
  }

  if (type === "geo" || type === "hotel") {
    return `coords:${lat},${lng}`;
  }

  throw new Error("Invalid location type");
}

function formatLocation(location) {
  if (!location) return "";

  if (location.type === "airport") {
    return `${location.name || "Airport"} (${location.code})`;
  }

  if (location.type === "hotel") {
    return location.name || "Hotel";
  }

  if (location.type === "geo") {
    return location.name || "Selected location";
  }

  return location.name || "Location";
}

function mapSearch(quote, offerHash, from, to, depatureDate) {
  return {
    id: quote.id,

    vehicleType: quote.vehicle?.is_shared ? "SHARED" : "PRIVATE",

    vehicleName: quote.vehicle?.title || "",

    capacity: quote.vehicle?.max_passengers || 0,

    image: "", // API does not provide images

    currency: quote.price?.currency || "EUR",

    netAmount: quote.price?.value || 0,

    totalAmount: quote.price?.value || 0,

    offerHash, // required for booking

    waitingTime: `${quote.minutes || 0} minutes`,

    pickupPoint: formatLocation(from),
    destinationPoint: formatLocation(to),
    pickupDateTime: depatureDate,
    converted: {
      totalAmount: 0,
      currency: "USD",
    },
  };
}

function mapBookingResponse(data, offer) {
  if (!data) {
    return {
      status: "failed",
      message: "Empty booking response",
    };
  }

  if (data.error) {
    return {
      status: "failed",
      message: data.error,
    };
  }

  return {
    status: "confirmed",
    reference: data.reference || "",
    totalAmount: offer.totalAmount,
    currency: offer.currency,
  };
}

async function getAuthToken() {
  try {
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken;
    }

    const body = new URLSearchParams({
      username: process.env.SUNTRANSFERS_USER,
      password: process.env.SUNTRANSFERS_PASS,
    });

    const res = await fetch(
      "https://api.staging.suntransfers.biz/authentication",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = await res.json();

    cachedToken = data.info.token;

    tokenExpiry = Date.now() + 55 * 60 * 1000;

    return cachedToken;
  } catch (error) {
    console.error("[get suntransfers auth token error]: ", error);
    return null;
  }
}

async function getAirportGatewayId() {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch(BASE_URL + "/gateways", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!data?.gateways) return null;

    const gateway = data.gateways.find((d) => d?.code === "BCN");
    console.log("gateway: ", gateway);
    return gateway?.id;
  } catch (error) {
    console.log("get airport gateway id error: ", error);
  }
}

async function getAllRoutesByGatewayId(gatewayId) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch(BASE_URL + "/routes/" + gatewayId, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    const route = data.routes.find((route) => route.country_code === "ES");

    console.log("Route: ", route);

    return route?.id;
  } catch (error) {
    console.log("get all routes by gateway id error: ", error);
    return null;
  }
}

async function createQuote() {
  try {
    const token = await getAuthToken();
    if (!token) return { quoteId: null, offerHash: null };

    const res = await fetch(BASE_URL + "/quotes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currency: "EUR",
        origin: "iata:ESBCN",
        destination: "gplace:ChIJ5yWyElqjpBIRb_6EZFj_3NM",
        passengers: "1,0,0",
        outwardDate: "2026-04-15T10:00:00",
        returnDate: "",
      }),
    });

    const data = await res.json();
    console.log("Quote response:", data);

    const quote = data?.quotes?.[0];

    return {
      quoteId: quote?.id || null,
      offerHash: data?._metadata?.offer?.hash || null,
    };
  } catch (err) {
    console.log("quote error:", err);
    return { quoteId: null, offerHash: null };
  }
}

async function createBooking(quoteId, offerHash) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch(BASE_URL + "/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quote_id: quoteId,
        offer: { hash: offerHash },

        currency: "EUR",
        language: "en",

        customer: {
          title: "Mr",
          name: "John",
          surname: "Doe",
          email: "john@example.com",
          mobile_country_code: "ES",
          mobile_phone: "612345678",
        },

        lead_passenger: {
          title: "Mr",
          name: "John",
          surname: "Doe",
          email: "john@example.com",
          mobile_country_code: "ES",
          mobile_phone: "612345678",
        },

        gold_protection: false,
        sms_notification: true,

        passengers: {
          total: 1,
        },

        transfers: [
          {
            outward: {
              cruise: {
                cruise_line: "Your Cruise Line",
                ship_name: "Your Ship Name",
                cruise_terminal: "Moll de Barcelona",
                ship_date_time: "2026-04-15T10:00:00",
              },
            },
            destination: {
              accommodation: {
                google_place_id: "ChIJ5yWyElqjpBIRb_6EZFj_3NM",
                address: "Hilton Diagonal Mar, Barcelona",
              },
            },
          },
        ],
      }),
    });

    const data = await res.json();
    console.log("Booking response:", data);

    return data?.reference || null;
  } catch (err) {
    console.log("create booking error:", err);
    return null;
  }
}

async function amendBooking(reference) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch(BASE_URL + "/bookings/" + reference, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lead_passenger: {
          title: "Mr",
          name: "amended-John",
          surname: "Doe",
          mobile_country_code: "ES",
          mobile_phone: "612345678",
          email: "john@test.com",
        },

        passengers: {
          total: 3,
        },

        transfers: [],
      }),
    });

    const text = await res.text();

    const data = text ? JSON.parse(text) : {};

    console.log("Amend response:", data);

    return data;
  } catch (error) {
    console.log("amend booking error:", error);
  }
}

async function cancelBooking(reference) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch(BASE_URL + "/bookings/" + reference, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Cancel status:", res.status);

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    console.log("Cancel response:", data);

    return data;
  } catch (error) {
    console.log("cancel booking error:", error);
  }
}

async function search(from, to, departureTime, packageType) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const origin = buildLocation(from?.type, from?.code, from?.lat, from?.lng);
    const destination = buildLocation(to?.type, to?.code, to?.lat, to?.lng);

    const body = {
      currency: "EUR",
      origin,
      destination,
      passengers: "1,0,0",
      outwardDate: departureTime,
    };

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!data?.quotes) return null;

    const offerHash = data?._metadata?.offer?.hash || "";

    const filtered = data.quotes.filter((q) =>
      filterByPackage(q.vehicle?.code || "", packageType),
    );

    if (filtered.length === 0) return null;

    return mapSearch(filtered[0], offerHash, from, to, departureTime);
  } catch (error) {
    console.error("[search transfer error]: ", error);
    return null;
  }
}

async function book(
  quoteId,
  offerHash,
  passenger,
  offer,
  outward,
  destination,
) {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const body = {
      quote_id: quoteId,

      offer: {
        hash: offerHash,
      },

      customer: {
        title: passenger.title,
        name: passenger.firstName,
        surname: passenger.lastName,
        email: passenger.email,
        mobile_country_code: passenger.countryCode,
        mobile_phone: passenger.phone,
      },

      lead_passenger: {
        title: passenger.title,
        name: passenger.firstName,
        surname: passenger.lastName,
        email: passenger.email,
        mobile_country_code: passenger.countryCode,
        mobile_phone: passenger.phone,
      },

      passengers: {
        total: 1,
      },

      currency: offer.currency,
      language: "en",

      gold_protection: false,
      sms_notification: true,

      transfers: [
        {
          outward,
          destination,
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return mapBookingResponse(data, offer);
  } catch (error) {
    console.error("[book transfer error]: ", error);

    return {
      status: "failed",
      message: "Transfer booking failed",
    };
  }
}

module.exports = {
  search,
  book,
  getAirportGatewayId,
  getAllRoutesByGatewayId,
  createQuote,
  createBooking,
  amendBooking,
  cancelBooking,
};
