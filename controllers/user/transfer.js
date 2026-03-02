const services = require("../../services/transfer");

const get = async (req, res) => {
  try {
    const {
      fromType, // "iata" | "gps"
      fromValue,
      toType,
      toValue,
      date,
      time,
      packageType,
    } = req.query;

    const offer = await services.search(
      fromType,
      fromValue,
      toType,
      toValue,
      date,
      time,
      packageType,
    );
    res.json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { rateKey, holder, flightInfo, totalAmount } = req.body;
    const result = await services.book(
      rateKey,
      holder,
      flightInfo,
      totalAmount,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

module.exports = { get, book };
