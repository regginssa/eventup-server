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

async function search(
  fromType, // "iata" | "gps"
  fromValue,
  toType,
  toValue,
  date,
  time,
  packageType = "standard",
  adults = 1,
) {
  try {
    const payload = {
      language: "en",
      occupancy: { adults, children: 0, infants: 0 },
      from:
        fromType === "iata"
          ? { type: "IATA", code: fromValue }
          : { type: "GPS", latitude: fromValue.lat, longitude: fromValue.lng },
      to: { type: "GPS", latitude: toValue.lat, longitude: toValue.lng },
      outbound: { date, time },
    };

    const response = await fetch(`${BASE_URL_TRANSFERS}/availability`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) return [];

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

async function book(rateKey, holder, flightInfo, totalAmount) {
  try {
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
          transferDetails: [
            {
              type: "FLIGHT",
              direction: "ARRIVAL",
              code: flightInfo.flightNumber,
              companyName: flightInfo.airlineName,
            },
          ],
        },
      ],
      clientReference: `EVENTUP_TR_${Date.now()}`,
    };

    const response = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.bookings) {
      return {
        status: "failed",
        bookingReference: "",
        clientReference: payload.clientReference,
        message: data.error?.message || "Transfer booking failed.",
      };
    }

    const b = data.bookings[0];

    return {
      status: b.status.toLowerCase(),
      bookingReference: b.reference,
      clientReference: b.clientReference,
      pickupDate: b.transfers[0].pickupInformation.date,
      pickupTime: b.transfers[0].pickupInformation.time,
      vehicleName: b.transfers[0].vehicle.name,
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
