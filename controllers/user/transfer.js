const services = require("../../services/transfer");

const get = async (req, res) => {
  try {
    const { from, to, departureTime, packageType } = req.body;
    const offer = await services.search(from, to, departureTime, packageType);
    res.json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { quoteId, offerHash, passenger, offer, outward, destination } =
      req.body;

    const result = await services.book(
      quoteId,
      offerHash,
      passenger,
      offer,
      outward,
      destination,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

module.exports = { get, book };
