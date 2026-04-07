const services = require("../../services/hotel");
const { convertCurrency } = require("../../utils/currency");

const get = async (req, res) => {
  try {
    const { lat, lng, checkIn, checkOut, packageType } = req.query;
    let offers = await services.search(
      lat,
      lng,
      checkIn,
      checkOut,
      packageType,
    );

    if (offers.length > 0) {
      for (const offer of offers) {
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
    }

    res.status(200).json({ ok: true, data: offers });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const quote = async (req, res) => {
  try {
    const { rateId } = req.body;
    const result = await services.quote(rateId);

    if (result) {
      if (result.currency === "EUR") {
        result.converted.totalAmount = result.totalAmount;
      } else {
        const totalAmount = await convertCurrency(
          result.totalAmount,
          result.currency,
        );

        if (Number(totalAmount) <= 0) {
          return res.json({ ok: true, data: null });
        }

        result.converted.totalAmount = totalAmount;
      }
    }

    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { quoteId, phoneNumber, guestInfo, specialRequests } = req.body;

    const result = await services.book({
      quoteId,
      phoneNumber,
      guestInfo,
      specialRequests: specialRequests || "",
    });

    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, quote, book };
