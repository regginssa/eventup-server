const service = require("../../services/airwallex");

const createPaymentIntent = async (req, res) => {
  try {
    const pit = await service.paymentIntent(req.body);
    res.json({ ok: true, data: pit });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { createPaymentIntent };
