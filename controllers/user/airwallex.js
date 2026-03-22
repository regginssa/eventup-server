const User = require("../../models/User");
const service = require("../../services/airwallex");

const customer = {
  create: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.json({ ok: false, message: "User not found" });
      }

      const { email, firstName, lastName } = user;

      const customerId = await service.customer.create({
        email,
        firstName,
        lastName,
        userId: user._id.toString(),
      });

      if (!customerId) {
        return res.json({ ok: false, data: null });
      }

      const pit = await service.paymentIntent.create({
        amount: 0,
        currency: "USD",
        customerId,
      });

      if (!pit) {
        return res.json({ ok: false, data: null });
      }

      user.airwallexCustomerId = customerId;
      await user.save();
      res.json({ ok: true, data: pit });
    } catch (e) {
      res.status(500).json({ ok: false, messaeg: "internal server error" });
    }
  },
};

const paymentIntent = {
  create: async (req, res) => {
    try {
      const pit = await service.paymentIntent.create({
        ...req.body,
        userId: req.user.id,
      });
      res.json({ ok: true, data: pit });
    } catch (e) {
      console.error("airwallex create payment error: ", e);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  },
};

module.exports = { customer, paymentIntent };
