const duffelService = require("../../services/duffel");

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

    const offers = await duffelService.search(
      oLat,
      oLng,
      dLat,
      dLng,
      departureDate,
      packageType,
    );

    res.status(200).json({ ok: true, data: offers });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { offerId, passengers, payment } = req.body;

    const book = await duffelService.book(offerId, passengers, payment);

    if (!book.orderId) {
      return res.status(400).json({ ok: false, data: book });
    }

    return res.status(200).json({ ok: true, data: book });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, book };
