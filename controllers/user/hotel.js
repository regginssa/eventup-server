const services = require("../../services/hotel");
const dServices = require("../../services/dhotel");

const get = async (req, res) => {
  try {
    const { lat, lng, checkIn, checkOut, packageType } = req.query;
    const offer = await dServices.search(
      lat,
      lng,
      checkIn,
      checkOut,
      packageType,
    );

    console.log("Hotel offer:", offer);

    res.status(200).json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const checkRates = async (req, res) => {
  try {
    const { rateKey } = req.query;

    const offer = await services.checkRates(rateKey);
    res.json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { rateKey, paxes } = req.body;
    const result = await services.book(rateKey, paxes);
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, checkRates, book };
