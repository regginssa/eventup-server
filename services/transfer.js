const crypto = require("crypto");

const BASE_URL = "https://api.test.hotelbeds.com/transfer-api/1.0";
const API_KEY = process.env.HOTELBEDS_TRANSFER_API_KEY;
const SECRET = process.env.HOTELBEDS_TRANSFER_SECRET;

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
  };
}

function formatDate(dateInput) {
  const date = new Date(dateInput);

  const pad = (n) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

async function search({ from, to, departureDateTime, packageType }) {
  try {
    const url = `${BASE_URL}/availability/en/from/${from.type}/${from.code}/to/${to.type}/${to.code}/${formatDate(departureDateTime)}/1/0/0`;

    console.log("API URL:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });

    const json = await res.json();
    console.log("transfer search json: ", json);
    if (!json?.services) {
      return null;
    }

    const { services } = json;
    let service = null;

    if (packageType === "gold") {
      // luxury → private premium
      service = services.find(
        (s) => s.transferType === "PRIVATE" || s.category.code === "PRM",
      );
    } else {
      // standard → shared standard
      service = services.find(
        (s) => s.transferType === "SHARED" || s.category.code === "STND",
      );
    }

    if (!service) {
      return null;
    }

    // const transferTime = service.content.transferDetailInfo.find(
    //   (i) => i.id === "TRFTIME",
    // )?.value;

    const waitInfo = service.content.supplierTransferTimeInfo?.[0];

    return {
      id: service.serviceId,

      vehicleType: service.vehicle.code,
      vehicleName: service.vehicle.name,

      capacity: service.maxPaxCapacity,

      image: service.content.images?.[0]?.url || "",

      currency: service.price.currencyId,
      netAmount: service.price.netAmount || service.price.totalAmount,
      totalAmount: service.price.totalAmount,

      rateKey: service.rateKey,

      waitingTime: waitInfo?.value
        ? `${waitInfo.value} minutes`
        : "Up to 60 minutes",

      pickupPoint: service.pickupInformation.from.description,

      destinationPoint: service.pickupInformation.to.description,

      pickupDateTime: `${service.pickupInformation.date}T${service.pickupInformation.time}`,
      converted: {
        totalAmount: 0,
        currency: "EUR",
      },
    };
  } catch (e) {
    console.error("transfer search error: ", e);
    return null;
  }
}

async function book({ holder, rateKey, transferDetails, bookingId }) {
  try {
    const body = JSON.stringify({
      language: "en",
      holder,
      transfers: [
        {
          rateKey,
          transferDetails,
        },
      ],
      clientReference: bookingId,
      welcomeMessage: `Welcome ${holder.name} ${holder.surname}`,
      remark: "",
    });
    const url = `${BASE_URL}/bookings`;

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body,
    });
    const json = await res.json();
    console.log("transfer book json: ", json);

    if (!json?.bookings || !json?.bookings?.length === 0) {
      return {
        status: "failed",
        message: "Transfer booking failed",
      };
    }

    const booking = json.bookings?.[0];
    const transfer = booking?.transfers?.[0];

    const pickupDesc = transfer?.pickupInformation?.pickup?.description || "";

    // extract phone (simple regex)
    const phoneMatch = pickupDesc.match(/\+\d[\d\s]+/);

    return {
      status: booking?.status,
      reference: booking?.reference,
      clientReference: booking?.clientReference,
      pickupDateTime: `${transfer?.pickupInformation?.date}T${transfer?.pickupInformation?.time}`,
      pickupPoint: transfer?.pickupInformation?.from?.description,
      destinationPoint: transfer?.pickupInformation?.to?.description,
      vehicleName: transfer?.vehicle?.name,
      totalAmount: booking?.totalAmount,
      currency: booking?.currency,
      supplierPhone: phoneMatch ? phoneMatch[0] : undefined,
      message: "Booking confirmed",
    };
  } catch (e) {
    console.error("transfer book error: ", e);
    return {
      status: "failed",
      message: "Transfer booking failed",
    };
  }
}

module.exports = { search, book };
