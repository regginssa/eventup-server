const crypto = require("crypto");
const { Airwallex } = require("@airwallex/node-sdk");

const airwallex = new Airwallex({
  clientId: process.env.AIRWALLEX_CLIENT_ID,
  apiKey: process.env.AIRWALLEX_API_KEY,
  env: "demo", // 'demo' or 'prod'
});

const createPaymentIntent = async ({
  amount,
  currency,
  merchantOrderId,
  returnUrl,
}) => {
  try {
    const requestId = crypto.randomUUID();

    const pit =
      await airwallex.paymentAcceptance.paymentIntents.createPaymentIntent({
        request_id: requestId,
        amount: Number(amount),
        currency: currency.toUpperCase(),
        merchant_order_id: merchantOrderId,
        descriptor: "CHARLIE UNICORN AI LTD",
        return_url: returnUrl,
        payment_method_types: ["card"],
      });

    return pit;
  } catch (e) {
    console.error("create airwallex payment intent error: ", e);
    return null;
  }
};

module.exports = { createPaymentIntent };
