const BASE_URL = "https://api.staging.suntransfers.biz/v1";

let cachedToken = null;
let tokenExpiry = null;

function filterByPackage(vehicleName, packageType) {
  const name = vehicleName.toLowerCase();

  if (packageType === "STANDARD") {
    return !name.includes("luxury") && !name.includes("premium");
  }

  if (packageType === "GOLD") {
    return name.includes("luxury") || name.includes("premium");
  }

  return true;
}

function map(quote, from, to, departureTime) {
  return {
    id: quote.id,

    vehicleType: quote.vehicle?.type || "PRIVATE",
    vehicleName: quote.vehicle?.title || "",

    capacity: quote.vehicle?.max_passengers || 0,

    image: quote.vehicle?.images?.[0] || "",

    currency: quote.price?.currency || "EUR",

    netAmount: quote.price?.value || 0,

    totalAmount: quote.price?.value || 0,

    offerHash: quote._metadata?.offer?.hash || "",

    waitingTime: quote.vehicle?.waiting_time
      ? `${quote.vehicle.waiting_time} minutes`
      : "60 minutes",

    pickupPoint: JSON.stringify(from),
    destinationPoint: JSON.stringify(to),

    pickupLat:
      from?.location?.latitude || from?.accommodation?.latitude || null,
    pickupLng:
      from?.location?.longitude || from?.accommodation?.longitude || null,

    dropoffLat: to?.location?.latitude || to?.accommodation?.latitude || null,
    dropoffLng: to?.location?.longitude || to?.accommodation?.longitude || null,

    pickupDateTime: departureTime,
  };
}

async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const username = process.env.SUNTRANSFERS_USER;
  const password = process.env.SUNTRANSFERS_PASS;

  const base64 = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(`${BASE_URL}/authentication`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  cachedToken = data.token;

  tokenExpiry = Date.now() + 55 * 60 * 1000;

  return cachedToken;
}

async function search(from, to, departureTime, packageType) {
  try {
    const token = await getAuthToken();

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outward: {
          origin: from,
          destination: to,
          pickup_date_time: departureTime,
        },
        passengers: {
          adults: 1,
          children: 0,
          infants: 0,
        },
      }),
    });

    const data = await res.json();

    if (!data?.quotes) return null;

    const filtered = data.quotes.filter((q) =>
      filterByPackage(q.vehicle?.title || "", packageType),
    );

    if (filtered.length === 0) return null;

    const mapped = map(filtered[0], from, to, departureTime);

    console.log("[transfer search mapped data]: ", mapped);

    return mapped;
  } catch (error) {
    console.error("[search transfer error]: ", error);
    return null;
  }
}

async function book({ quoteId, offerHash, passenger }) {
  try {
    const token = await getAuthToken();

    const res = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
        },

        passengers: {
          adults: 1,
          children: 0,
          infants: 0,
        },

        currency: "EUR",
        language: "en",

        gold_protection: false,
        sms_notification: true,
      }),
    });

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("[book transfer error]: ", error);
    return {
      status: "failed",
      message: "Booking transfer failed",
    };
  }
}

module.exports = { search, book };
