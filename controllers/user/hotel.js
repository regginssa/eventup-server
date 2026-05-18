const services = require("../../services/hotel");
const { convertCurrency, getCurrencyRate } = require("../../utils/currency");

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
      const currencies = [...new Set(offers.map((o) => o.currency))];
      const rateMap = {};
      await Promise.all(
        currencies.map(async (currency) => {
          rateMap[currency] = await getCurrencyRate(currency);
        }),
      );

      for (const offer of offers) {
        const totalAmount = offer.totalAmount;
        if (Number(totalAmount) <= 0) {
          return res.json({ ok: true, data: null });
        }

        const rate = rateMap[offer.currency];

        if (!rate) {
          return res.json({ ok: true, data: null });
        }

        offer.converted.totalAmount = Number(totalAmount) * rate;
        offer.defaultRate.total_amount =
          Number(offer.defaultRate.total_amount) * rate;
        offer.rooms.forEach((room) => {
          room.rates.forEach((rt) => {
            rt.total_amount = Number(rt.total_amount) * rate;
          });
        });
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
