const crypto = require("crypto");

const API_KEY = process.env.HOTELBEDS_HOTEL_API_KEY;
const SECRET = process.env.HOTELBEDS_HOTEL_SECRET;
const BASE_URL = "https://api.test.hotelbeds.com/hotel-api/1.0";
const BASE_URL_CONTENT = "https://api.test.hotelbeds.com/hotel-content-api/1.0";

function getHeaders() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha256")
    .update(API_KEY + SECRET + timestamp)
    .digest("hex");

  return {
    "Api-key": API_KEY,
    "X-Signature": signature,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
  };
}

async function content(hotelCode) {
  try {
    const url = `${BASE_URL_CONTENT}/hotels/${hotelCode}/details?language=ENG&useSecondaryLanguage=False`;

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok || !data.hotel) {
      console.error("Content API Error:", data);
      return null;
    }

    const h = data.hotel;

    return {
      id: h.code.toString(),
      name: h.name.content,
      category: h.categoryCode,

      // Address Breakdown
      address: h.address.content, // "123 Main St, Chicago, IL"
      street: h.address.content, // Specific Street
      city: h.city.content, // Town/City
      postalCode: h.postalCode, // Zip
      countryCode: h.countryCode, // e.g., "US"

      latitude: h.coordinates.latitude.toString(),
      longitude: h.coordinates.longitude.toString(),

      // Images are usually in an array; taking the first one
      image:
        h.images && h.images.length > 0
          ? `http://photos.hotelbeds.com/giata/${h.images[0].path}`
          : "https://via.placeholder.com/300",
    };
  } catch (error) {
    console.error("Failed to fetch hotel content:", error);
    return null;
  }
}

async function search(lat, lng, checkIn, checkOut, packageType) {
  try {
    const minStars = packageType === "gold" ? 4 : 1;
    const maxStars = packageType === "gold" ? 5 : 3;

    const response = await fetch(`${BASE_URL}/hotels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        stay: { checkIn, checkOut },
        occupancies: [{ rooms: 1, adults: 1, children: 0 }],
        geolocation: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          radius: 20,
          unit: "km",
        },
        filter: { minStars, maxStars },
      }),
    });

    const json = await response.json();
    console.log("[hotel json]: ", json);
    if (!json.hotels || !json.hotels.hotels) return null;

    const h = json.hotels.hotels[0];

    if (!h) return null;

    const details = await content(h.code.toString());

    if (!details) return null;

    const firstRoom = h.rooms[0];
    const firstRate = firstRoom.rates[0];
    const currencyCode = firstRate.currency || firstRoom.currency || h.currency;

    return {
      id: h.code.toString(),
      name: h.name,
      category: h.categoryName, // e.g., "4 STARS"
      address: h.address,
      latitude: h.latitude.toString(),
      longitude: h.longitude.toString(),
      image: "https://via.placeholder.com/300",
      currency: currencyCode,
      totalAmount: parseFloat(firstRate.net),
      netAmount: parseFloat(firstRate.net),
      rateKey: firstRate.rateKey,
      roomName: firstRoom.name,
      boardName: firstRate.boardName,
      cancellationPolicy: firstRate.cancellationPolicies
        ? {
            amount: parseFloat(firstRate.cancellationPolicies[0].amount),
            from: firstRate.cancellationPolicies[0].from,
          }
        : { amount: 0, from: null },
      street: details.street,
      city: details.city,
      postalCode: details.postalCode,
      countryCode: details.countryCode,
      address: details.address,
    };
  } catch (err) {
    console.error("[hotel search error]: ", err);
    return null;
  }
}

async function checkRates(rateKey) {
  console.log("[rateKey]: ", rateKey);
  try {
    const body = {
      rooms: [
        {
          rateKey,
        },
      ],
    };

    const response = await fetch(`${BASE_URL}/checkrates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const json = await response.json();

    if (json.error) {
      console.error("[Hotelbeds CheckRates Error]:", json.error.message);
      console.error("Payload Sent:", body);
      return null;
    }

    const hotel = json.hotel;
    const room = hotel.rooms[0];
    const rate = room.rates[0];

    return {
      id: hotel.code.toString(),
      name: hotel.name,
      category: hotel.categoryName || "Hotel",
      address: `${hotel.address}, ${hotel.city}`,
      latitude: hotel.latitude.toString(),
      longitude: hotel.longitude.toString(),
      image: "https://via.placeholder.com/300",
      currency: hotel.currency,
      totalAmount: parseFloat(rate.net),
      netAmount: parseFloat(rate.net),
      rateKey: rate.rateKey,
      roomName: room.name,
      boardName: rate.boardName,
      cancellationPolicy: rate.cancellationPolicies
        ? {
            amount: parseFloat(rate.cancellationPolicies[0].amount),
            from: rate.cancellationPolicies[0].from,
          }
        : { amount: 0, from: null },
    };
  } catch (err) {
    console.error("[hotel check rates error]: ", err);
    return null;
  }
}

async function book(rateKey, paxes) {
  try {
    const response = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        holder: { name: paxes[0].name, surname: paxes[0].surname },
        rooms: [
          {
            rateKey: rateKey,
            paxes,
          },
        ],
        clientReference: `EVT_${Math.random().toString(36).slice(2, 10)}`,
      }),
    });

    const json = await response.json();

    if (json.error) {
      return {
        status: "failed",
        message: json.error.message,
      };
    }

    // Matching IHotelBookingResponse
    const booking = json.booking;
    return {
      status: "confirmed",
      bookingReference: booking.reference,
      clientReference: booking.clientReference,
      hotelName: booking.hotel.name,
      checkIn: booking.hotel.checkIn,
      checkOut: booking.hotel.checkOut,
      totalAmount: parseFloat(booking.totalNet),
      currency: booking.currency,
      vatNumber: "PL4990709239",
      message: "Your stay is confirmed!",
    };
  } catch (err) {
    console.error("[book hotel error]: ", err);
    return {
      status: "failed",
      message: "Booking hotel failed",
    };
  }
}

module.exports = { search, checkRates, book };
