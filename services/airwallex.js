const { Airwallex } = require("@airwallex/node-sdk");

const airwallex = new Airwallex({
  clientId: process.env.AIRWALLEX_CLIENT_ID,
  apiKey: process.env.AIRWALLEX_API_KEY,
  env: "demo", // 'demo' or 'prod'
});

const customer = {
  create: async ({ email, firstName, lastName, userId }) => {
    try {
      const res = await airwallex.post("/api/v1/pa/customers/create", {
        request_id: `req_${Date.now()}`,
        email: email,
        first_name: firstName,
        last_name: lastName,
        merchant_customer_id: "customer_123123",
      });

      return res.id;
    } catch (e) {
      console.log("create customer error: ", e);
      return null;
    }
  },
};

const paymentIntent = {
  create: async ({ amount, currency, userId, returnUrl }) => {
    try {
      const pit =
        await airwallex.paymentAcceptance.paymentIntents.createPaymentIntent({
          request_id: `req_${Date.now()}`,
          amount: Number(amount),
          currency: currency.toUpperCase(),
          payment_method_types: ["card"],
          merchant_order_id: userId,
          return_url: returnUrl,
        });

      return pit;
    } catch (e) {
      console.error("create airwallex payment intent error: ", e);
      return null;
    }
  },
};

module.exports = { customer, paymentIntent };
