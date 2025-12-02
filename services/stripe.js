const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    { expand: ["payment_method"] }
  );

  return setupIntent.payment_method;
};

module.exports = {
  createCustomer,
  setupIntents,
  retrieveSetupIntentPaymentMethod,
};
