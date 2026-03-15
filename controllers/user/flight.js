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
    } = req.query; // MUST be query for GET requests

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
      packageType,
    );

    if (offer) {
      const totalAmount = await convertCurrency(
        offer.currency,
        "USD",
        offer.totalAmount,
      );

      if (Number(totalAmount) <= 0) {
        return res.json({ ok: true, data: null });
      }
      offer.converted.totalAmount = totalAmount;
    }

    res.status(200).json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { offerId, passengers, totalAmount, currency } = req.body;

    const book = await services.book(
      offerId,
      passengers,
      totalAmount,
      currency,
    );

    if (!book.orderId) {
      return res.status(400).json({ ok: false, data: book });
    }

    return res.status(200).json({ ok: true, data: book });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, book };
