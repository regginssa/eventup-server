const paymentIntents = require("../../services/duffel/paymentIntents");

const createPaymentIntents = async (req, res) => {
  try {
    const intents = await paymentIntents.create(req.body);
    res.json({ ok: true, data: intents });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { createPaymentIntents };
