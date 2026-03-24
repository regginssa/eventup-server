const services = require("../../services/flight");
const { convertCurrency } = require("../../utils/currency");

const get = async (req, res) => {
  try {
    const {
      originLat,
      originLng,
      destLat,
      destLng,
      departureDate,
      packageType,
      tripType,
      returnDate,
    } = req.query;

    // Convert to actual numbers here
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    let offer = await services.search(
      oLat,
      oLng,
      dLat,
      dLng,
      departureDate,
      returnDate,
      packageType,
      tripType,
    );

    if (offer) {
      if (offer.currency === "EUR") {
        offer.converted.totalAmount = offer.totalAmount;
      } else {
        const totalAmount = await convertCurrency(
          offer.totalAmount,
          offer.currency,
        );

        if (Number(totalAmount) <= 0) {
          return res.json({ ok: true, data: null });
        }
        offer.converted.totalAmount = totalAmount;
      }
    }

    res.status(200).json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { offerId, passengers, totalAmount, currency } = req.body;

    const result = await services.book(
      offerId,
      passengers,
      totalAmount,
      currency,
    );

    return res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const webhook = async (req, res) => {
  try {
    const event = req.body;

    console.log("Received duffel webhook:", event.type);

    switch (event.type) {
      case "order.created":
        console.log("✅ Order created");
        break;

      case "order.creation_failed":
        console.log("❌ Order failed");
        break;

      case "stays.booking.created":
        console.log("🏨 Stay created");
        break;

      case "stays.booking_creation_failed":
        console.log("Stays booking failed");
        break;

      default:
        console.log("Unhandled event:", event.type);
    }

    res.status(200).send("ok");
  } catch (error) {}
};

module.exports = { get, book, webhook };
