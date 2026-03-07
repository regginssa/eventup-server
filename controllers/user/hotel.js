const services = require("../../services/hotel");

const get = async (req, res) => {
  try {
    const { lat, lng, checkIn, checkOut, packageType } = req.query;
    const offer = await services.search(
      lat,
      lng,
      checkIn,
      checkOut,
      packageType,
    );

    res.status(200).json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const quote = async (req, res) => {
  try {
    const { rateId } = req.body;
    const result = await services.quote(rateId);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const book = async (req, res) => {
  try {
    const { quoteId, phoneNumber, guestInfo, specialRequests } = req.body;

    console.log("[body data]: ", req.body);

    const result = await services.book(
      quoteId,
      phoneNumber,
      guestInfo,
      specialRequests || "",
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get, quote, book };
