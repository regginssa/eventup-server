const crypto = require("crypto");

const API_KEY = process.env.HOTELBEDS_HOTEL_API_KEY;
const SECRET = process.env.HOTELBEDS_HOTEL_SECRET;
const BASE_URL = "https://api.test.hotelbeds.com/hotel-api/1.0";

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

async function search(
  lat,
  lng,
  checkIn,
  checkOut,
  packageType = "standard", // "standard" or "gold"
  rooms = 1,
  adults = 1,
) {
  try {
    // Logic for Gold vs Standard
    const minStars = packageType === "gold" ? 4 : 1;
    const markup = packageType === "gold" ? 1.2 : 1.1; // 20% vs 10% profit

    const payload = {
      stay: { checkIn, checkOut },
      occupancies: [
        { rooms: Number(rooms), adults: Number(adults), children: 0 },
      ],
      geolocation: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        radius: 20,
        unit: "km",
      },
      // Filter by stars in the request for efficiency
      filter: {
        minCategory: minStars,
      },
      // Ask for more data to find the best VIP options
      review: { type: "HOTELBEDS", minRate: 4 },
    };

    const response = await fetch(`${BASE_URL}/hotels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.hotels?.hotels) return [];

    const hotel = data.hotels.hotels[0];

    // For GOLD, we try to find a Suite or Superior room first
    let selectedRoom = hotel.rooms[0];
    if (packageType === "gold") {
      const luxuryRoom = hotel.rooms.find(
        (r) =>
          r.name.toLowerCase().includes("suite") ||
          r.name.toLowerCase().includes("superior") ||
          r.name.toLowerCase().includes("deluxe"),
      );
      if (luxuryRoom) selectedRoom = luxuryRoom;
    }

    const rate = selectedRoom.rates[0];
    const netPrice = parseFloat(rate.net);

    return {
      id: hotel.code.toString(),
      name: hotel.name,
      category: hotel.categoryName,
      address: hotel.address,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      image: hotel.images?.[0]?.path
        ? `http://photos.hotelbeds.com/giata/${hotel.images[0].path}`
        : "https://via.placeholder.com/300",
      currency: hotel.currency,
      netAmount: netPrice,
      totalAmount: parseFloat((netPrice * markup).toFixed(2)), // Final price for User
      rateKey: rate.rateKey,
      roomName: selectedRoom.name,
      boardName: rate.boardName,
      cancellationPolicy: rate.cancellationPolicies?.[0]
        ? {
            amount: parseFloat(rate.cancellationPolicies[0].amount),
            from: rate.cancellationPolicies[0].from,
          }
        : null,
    };
  } catch (error) {
    console.error("Hotelbeds Search Error:", error.message);
    return null;
  }
}

async function checkRates(rateKey, packageType = "standard") {
  try {
    const payload = {
      rooms: [{ rateKey }],
    };

    const response = await fetch(`${BASE_URL}/checkrates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.hotel) {
      throw new Error(data.error?.message || "Rate no longer available");
    }

    const hotel = data.hotel;
    const room = hotel.rooms[0];
    const rate = room.rates[0];

    // Use the same markup logic as your search function
    const markup = packageType === "gold" ? 1.2 : 1.1;
    const netPrice = parseFloat(rate.net);

    // Return the IHotelOffer interface
    return {
      id: hotel.code.toString(),
      name: hotel.name,
      category: hotel.categoryName,
      address: hotel.address,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      image: hotel.images?.[0]?.path
        ? `http://photos.hotelbeds.com/giata/${hotel.images[0].path}`
        : "https://via.placeholder.com/300",
      currency: hotel.currency,
      netAmount: netPrice,
      totalAmount: parseFloat((netPrice * markup).toFixed(2)),
      rateKey: rate.rateKey, // This might be a NEW rateKey from the response
      roomName: room.name,
      boardName: rate.boardName,
      // CheckRate gives more accurate cancellation info
      cancellationPolicy: rate.cancellationPolicies?.[0]
        ? {
            amount: parseFloat(rate.cancellationPolicies[0].amount),
            from: rate.cancellationPolicies[0].from,
          }
        : null,
    };
  } catch (error) {
    console.error("Hotelbeds CheckRate Mapping Error:", error.message);
    return null;
  }
}

async function book(rateKey, paxes, holder, totalAmount) {
  try {
    const payload = {
      holder: {
        name: holder.firstName,
        surname: holder.lastName,
      },
      rooms: [
        {
          rateKey: rateKey,
          paxes: paxes.map((p) => ({
            roomId: 1,
            type: p.type || "AD",
            name: p.firstName,
            surname: p.lastName,
          })),
        },
      ],
      clientReference: `EVENTUP_${Date.now()}`,
      // Hotelbeds requires this for 'Merchant' bookings in some regions
      tolerance: 2.0, // Allows for 2% price fluctuation if it changes at the exact moment of booking
    };

    const response = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.booking) {
      return {
        status: "failed",
        bookingReference: "",
        clientReference: payload.clientReference,
        message:
          data.error?.message || "Hotel confirmation failed at the final step.",
      };
    }

    const b = data.booking;

    // Standardized Map
    return {
      status: b.status.toLowerCase(), // "CONFIRMED" -> "confirmed"
      bookingReference: b.reference,
      clientReference: b.clientReference,
      hotelName: b.hotel.name,
      checkIn: b.hotel.checkIn,
      checkOut: b.hotel.checkOut,
      totalAmount: parseFloat(totalAmount), // Passed from your controller markup logic
      currency: b.hotel.currency,
      message: "Your hotel has been successfully booked!",
    };
  } catch (error) {
    console.error("Hotelbeds Confirm Error:", error);
    return {
      status: "failed",
      bookingReference: "",
      clientReference: "",
      message:
        "A system error occurred during booking. Please contact support.",
    };
  }
}

module.exports = { search, checkRates, book };
