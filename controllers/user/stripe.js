const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const {
  createCustomer,
  setupIntents,
  retrieveSetupIntentPaymentMethod,
  createPaymentIntent,
  refundPayment,
} = require("../../services/stripe");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const {
        id,
        metadata: jsonMetadata,
        currency,
        amount,
        status,
        amount_received: amountReceived,
      } = event.data.object;

      const metadata = JSON.parse(jsonMetadata);

      if (!metadata.userId) break;

      const user = await User.findById(metadata.userId);

      if (!user) break;

      switch (metadata.type) {
        case "ticket":
          user.tickets.push(metadata.ticketId);
          await user.save();

          await Transaction.create({
            type: "buy",
            service: "ticket",
            amount,
            currency,
            status: "completed",
            amountReceived,
            metadata,
            txId: id,
            paymentMethod: "credit",
            userId: user._id,
          });
          break;

        case "subscription":
          user.subscription = {
            id: metadata.subscriptionId,
            startedAt: new Date().toISOString().split("T")[0],
          };
          await user.save();

          await Transaction.create({
            type: "buy",
            service: "subscription",
            amount,
            currency,
            status: "completed",
            amountReceived,
            metadata,
            txId: id,
            paymentMethod: "credit",
            userId: user._id,
          });
          break;
      }

      break;

    case "payment_intent.payment_failed":
      const failedIntent = event.data.object;
      console.log("Payment failed:", failedIntent.last_payment_error?.message);
      // ❌ Optional: notify user
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

const getCustomerId = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("[passport user id]: ", userId);

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

    user.stripe = {
      customerId,
      paymentMethods: [],
    };
    await user.save();

    res.status(200).json({ ok: true, data: customerId });
  } catch (error) {
    console.error("Error in getCustomerId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getClientSecret = async (req, res) => {
  try {
    const customerId = req.user.stripe.customerId;
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
      setupIntentClientSecret,
    );

    if (!paymentMethod) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to retrieve payment method" });
    }

    user.stripe.paymentMethods.push({
      id: paymentMethod.id,
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
    const { paymentMethodId, metadata: bodyMeta, amount, currency } = req.body;

    const user = await User.findById(userId);

    if (!user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const metadata = {
      userId: user._id.toString(),
      email: user.email,
      ...bodyMeta,
    };

    const customerId = user.stripe.customerId;

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
      metadata,
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

const refundStripePaymentIntent = async (req, res) => {
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
  webhook,
  getCustomerId,
  getClientSecret,
  saveStripePaymentMethod,
  createStripePaymentIntent,
  refundStripePaymentIntent,
};
