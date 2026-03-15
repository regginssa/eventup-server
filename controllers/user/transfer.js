const services = require("../../services/transfer");
const { convertCurrency } = require("../../utils/currency");

const get = async (req, res) => {
  try {
    const { from, to, departureTime, packageType } = req.body;
    let offer = await services.search(from, to, departureTime, packageType);

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
