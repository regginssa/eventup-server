const service = require("../../services/airwallex");

const createPaymentIntent = async (req, res) => {
  try {
    const pit = await service.createPaymentIntent(req.body);
    res.json({ ok: true, data: pit });
  } catch (e) {
    console.error("airwallex create payment error: ", e);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { createPaymentIntent };
