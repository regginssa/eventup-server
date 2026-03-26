const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { calculateStripeAmount } = require("../utils/currency");

const createCustomer = async (email, name) => {
  const customer = await stripe.customers.create({
    email,
    name,
    description: "Charlie Party V2 Customer " + name + " " + email,
  });
  return customer.id;
};

const setupIntents = async (customerId) => {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: { enabled: true },
  });

  return setupIntent.client_secret;
};

const retrieveSetupIntentPaymentMethod = async (setupIntentId) => {
  const setupIntent = await stripe.setupIntents.retrieve(
    setupIntentId.split("_secret")[0], // Extract ID
    { expand: ["payment_method"] },
  );

  return setupIntent.payment_method;
};

const createPaymentIntent = async (
  customerId,
  paymentMethodId,
  amount,
  currency = "EUR",
  metadata,
) => {
  const stripeAmount = calculateStripeAmount(amount, currency);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: stripeAmount,
    currency: currency.toUpperCase(),
    customer: customerId,
    payment_method: paymentMethodId,
    setup_future_usage: "off_session",
    metadata,
  });

  if (paymentIntent?.error) {
    return {
      message: paymentIntent.error?.message,
    };
  }

  return { id: paymentIntent?.id, clientSecret: paymentIntent?.client_secret };
};

const createCapturePaymentIntent = async (
  customerId,
  paymentMethodId,
  amount,
  currency = "EUR",
  metadata,
) => {
  const stripeAmount = calculateStripeAmount(amount, currency);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: stripeAmount,
    currency: currency.toUpperCase(),
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: "manual", // 🔑 ADD THIS
    setup_future_usage: "off_session",
    metadata,
  });

  if (paymentIntent?.error) {
    return {
      message: paymentIntent.error?.message,
    };
  }

  return { id: paymentIntent?.id, clientSecret: paymentIntent?.client_secret };
};

const capturePaymentIntent = async (paymentIntentId, amount) => {
  await stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: amount,
  });
};

const refundPayment = async (paymentIntentId) => {
  await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
};

module.exports = {
  createCustomer,
  setupIntents,
  retrieveSetupIntentPaymentMethod,
  createPaymentIntent,
  createCapturePaymentIntent,
  capturePaymentIntent,
  refundPayment,
};
