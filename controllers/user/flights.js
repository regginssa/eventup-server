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
    } = req.params;

    const flights = await duffelService.search(
      originLat,
      originLng,
      destLat,
      destLng,
      departureDate,
      packageType,
    );

    res.status(200).json({ ok: true, data: flights });
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
