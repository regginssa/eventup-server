const services = require("../../services/transfer");
const { convertCurrency } = require("../../utils/currency");

const get = async (req, res) => {
  try {
    const { from, to, departureDateTime, packageType } = req.body;
    let offer = await services.search({
      from,
      to,
      departureDateTime,
      packageType,
    });

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

    res.json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { holder, bookingId, rateKey, transferDetails } = req.body;

    const result = await services.book({
      holder,
      bookingId,
      rateKey,
      transferDetails,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

module.exports = { get, book };
