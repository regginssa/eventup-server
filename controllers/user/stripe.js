const User = require("../../models/User");
const {
  createCustomer,
  setupIntents,
  retrieveSetupIntentPaymentMethod,
  createPaymentIntent,
  refundPayment,
} = require("../../services/stripe");

const getCustomerId = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const customerId = await createCustomer(user.email, user.name);

    if (!customerId) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to create Stripe customer" });
    }

    user.stripe.customer_id = customerId;
    await user.save();

    res.status(200).json({ ok: true, data: customerId });
  } catch (error) {
    console.error("Error in getCustomerId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getClientSecret = async (req, res) => {
  try {
    const customerId = req.user.stripe.customer_id;
    const clientSecret = await setupIntents(customerId);
    res.status(200).json({ ok: true, data: clientSecret });
  } catch (error) {
    console.error("Error in getClientSecret:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const saveStripePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { setupIntentClientSecret } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const paymentMethod = await retrieveSetupIntentPaymentMethod(
      setupIntentClientSecret
    );

    if (!paymentMethod) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to retrieve payment method" });
    }

    user.stripe.payment_methods.push({
      payment_method_id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
      last4: paymentMethod.card.last4,
    });
    await user.save();

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("Error in saveStripePaymentMethod:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createStripePaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId, bookingOption, packageType, amount, currency } =
      req.body;

    const user = await User.findById(userId);

    if (!user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const metadata = {
      userId: user._id.toString(),
      email: user.email,
      bookingOption,
      packageType,
    };

    const customerId = user.stripe.customer_id;

    if (!customerId) {
      return res
        .status(400)
        .json({ ok: false, message: "Payment method is not verified" });
    }

    const result = await createPaymentIntent(
      customerId,
      paymentMethodId,
      amount,
      currency,
      metadata
    );

    if (!result?.clientSecret) {
      return res.status(500).json({ ok: false, message: result.message });
    }

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.log("pay stripe error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const refundStripePaymentIntent = async () => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await refundPayment(paymentIntentId);

    res.status(200).json({
      ok: true,
      message: "Your payment will be refunded within 3 or 4 business days",
    });
  } catch (error) {
    console.log("refund stripe payment intent: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  getCustomerId,
  getClientSecret,
  saveStripePaymentMethod,
  createStripePaymentIntent,
  refundStripePaymentIntent,
};
