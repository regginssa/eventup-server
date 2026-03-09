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
    bookingId: data.id || "",
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

async function book(quoteId, offerHash, passenger, offer, pickupDateTime) {
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
          outward: {
            accommodation: {
              name: offer.pickupPoint,
              address: offer.pickupPoint,
              pickup_date_time: pickupDateTime,
            },
          },

          destination: {
            accommodation: {
              name: offer.destinationPoint,
              address: offer.destinationPoint,
            },
          },
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

    console.log("[transfer booking response]:", data);

    return mapBookingResponse(data, offer);
  } catch (error) {
    console.error("[book transfer error]: ", error);

    return {
      status: "failed",
      message: "Transfer booking failed",
    };
  }
}

module.exports = { search, book };
