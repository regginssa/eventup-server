const services = require("../../services/hotel");

const get = async (req, res) => {
  try {
    const { lat, lng, checkIn, checkOut, packageType } = req.query;
    const offers = await services.search(
      lat,
      lng,
      checkIn,
      checkOut,
      packageType,
    );
    res.status(200).json({ ok: true, data: offers });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const checkRates = async (req, res) => {
  try {
    const { rateKey, packageType } = req.query;
    const offer = await services.checkRates(rateKey, packageType);
    res.json({ data: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { rateKey, paxes, holder, totalAmount } = req.body;
    const result = await services.book(rateKey, paxes, holder, totalAmount);
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, checkRates, book };
