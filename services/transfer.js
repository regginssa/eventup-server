const crypto = require("crypto");

const API_KEY = process.env.HOTELBEDS_TRANSFER_API_KEY;
const SECRET = process.env.HOTELBEDS_TRANSFER_SECRET;
const BASE_URL = "https://api.test.hotelbeds.com/transfer-api/1.0";

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

async function checkStatus() {
  const response = await fetch(
    "https://api.test.hotelbeds.com/transfer-api/1.0/status",
    {
      method: "GET",
      headers: getHeaders(),
    },
  );
  console.log("Status Check:", await response.json());
}

async function search(
  fromType, // "iata" | "gps"
  fromCode,
  fromLat,
  fromLng,
  toType,
  toCode,
  toLat,
  toLng,
  date,
  time,
  packageType = "standard",
  adults = 1,
) {
  await checkStatus();
  try {
    const payload = {
      language: "en",
      occupancy: { adults, children: 0, infants: 0 },
      from:
        fromType === "IATA" || fromType === "ATLAS"
          ? { type: fromType, code: fromCode }
          : {
              type: "GPS",
              latitude: Number(fromLat),
              longitude: Number(fromLng),
            },
      to:
        toType === "IATA" || toType === "ATLAS"
          ? { type: toType, code: toCode }
          : {
              type: "GPS",
              latitude: Number(toLat),
              longitude: Number(toLng),
            },
      outbound: { date, time },
    };

    console.log("[payload]: ", payload);

    const response = await fetch(`${BASE_URL}/availability`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(data);
    if (!response.ok) return null;

    // Filter and Map based on Package Type
    const filteredServices = data.services.filter((service) => {
      const name = service.vehicle.name.toLowerCase();
      const isPrivate = service.transferType === "PRIVATE";

      if (packageType === "gold") {
        // Gold must be Private AND a high-end vehicle category
        return (
          isPrivate &&
          (name.includes("luxury") ||
            name.includes("executive") ||
            name.includes("private") ||
            service.category.includes("VIP"))
        );
      } else {
        // Standard favors Shared or Budget Private options
        return (
          service.transferType === "SHARED" ||
          (isPrivate && !name.includes("luxury") && !name.includes("executive"))
        );
      }
    });

    const markup = packageType === "gold" ? 1.25 : 1.15; // 25% for VIP service, 15% standard
    const service = filteredServices[0];

    return {
      id: service.id,
      vehicleType: service.transferType,
      vehicleName: service.vehicle.name,
      capacity: service.maxCapacity,
      image:
        service.content.images?.[0]?.url || "https://via.placeholder.com/150",
      currency: data.currency,
      netAmount: parseFloat(service.price.total),
      totalAmount: parseFloat((service.price.total * markup).toFixed(2)),
      rateKey: service.rateKey,
      waitingTime: `${service.waitingTime} min`,
      pickupPoint: service.pickupInformation.from.description,
      destinationPoint: service.pickupInformation.to.description,
    };
  } catch (error) {
    console.error("Transfer Search Error:", error);
    return null;
  }
}

async function book(
  rateKey,
  holder,
  transportInfo,
  totalAmount,
  addresses = {},
) {
  try {
    const isAirportTransfer = transportInfo.type === "FLIGHT";

    const payload = {
      language: "en",
      holder: {
        name: holder.firstName,
        surname: holder.lastName,
        email: holder.email,
        phone: holder.phone,
      },
      transfers: [
        {
          rateKey: rateKey,
          // Mandatory for "Hotel -> Event" (Point-to-Point)
          // Optional but highly recommended for "Airport -> Hotel" to avoid driver confusion
          pickupInformation: {
            description: addresses.pickupName || "Pickup Point",
            address: addresses.pickupAddress || "",
            town: addresses.pickupCity || "",
            zip: addresses.pickupZip || "",
            country: addresses.countryCode || "US",
          },
          dropoffInformation: {
            description: addresses.dropoffName || "Destination",
            address: addresses.dropoffAddress || "",
            town: addresses.dropoffCity || "",
            zip: addresses.dropoffZip || "",
            country: addresses.countryCode || "US",
          },
          transferDetails: [
            {
              type:
                transportInfo.type || (isAirportTransfer ? "FLIGHT" : "OTHER"),
              direction:
                transportInfo.direction ||
                (isAirportTransfer ? "ARRIVAL" : "DEPARTURE"),
              code: transportInfo.code, // Flight Number or Event Code
              companyName: transportInfo.companyName, // Airline or "Event Venue"
            },
          ],
        },
      ],
      clientReference: `EVENTUP_TR_${Date.now()}`,
    };

    // Use the appropriate BASE_URL (test or live) configured in your environment
    const response = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Hotelbeds returns errors in an 'errors' array, not a single 'error' object
    if (!response.ok || !data.bookings) {
      const errorMsg =
        data.errors && data.errors.length > 0
          ? data.errors[0].message
          : "Transfer booking failed.";

      return {
        status: "failed",
        bookingReference: "",
        clientReference: payload.clientReference,
        message: errorMsg,
      };
    }

    const b = data.bookings[0];
    const t = b.transfers[0];

    return {
      status: b.status.toLowerCase(), // 'confirmed' or 'pending'
      bookingReference: b.reference,
      clientReference: b.clientReference,
      pickupDate: t.pickupInformation.date,
      pickupTime: t.pickupInformation.time,
      vehicleName: t.vehicle.name,
      totalAmount: parseFloat(totalAmount),
      currency: b.currency,
      message: "Your transfer has been successfully booked!",
    };
  } catch (error) {
    console.error("Transfer Confirm Error:", error);
    return {
      status: "failed",
      message: "System error during transfer booking.",
    };
  }
}

module.exports = { search, book };
