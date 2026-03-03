const services = require("../../services/hotel");

const get = async (req, res) => {
  try {
    const { lat, lng, checkIn, checkOut, packageType, guestsCount } = req.query;
    const offers = await services.search(
      lat,
      lng,
      checkIn,
      checkOut,
      packageType,
      guestsCount,
    );
    res.status(200).json({ ok: true, data: offers });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { rateId, guestDetails, email, phone } = req.body;
    const result = await services.book(rateId, guestDetails, email, phone);
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, book };
