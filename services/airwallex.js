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
  create: async ({ amount, currency, metadata, returnUrl, userId }) => {
    try {
      const pit =
        await airwallex.paymentAcceptance.paymentIntents.createPaymentIntent({
          request_id: `req_${Date.now()}`,
          amount: Number(amount),
          currency: currency.toUpperCase(),
          payment_method_types: ["card"],
          merchant_order_id: userId,
          return_url: returnUrl,
          metadata,
        });

      return pit;
    } catch (e) {
      console.error("create airwallex payment intent error: ", e);
      return null;
    }
  },
};

const transfer = {
  create: async ({ currency, amount }) => {
    try {
      const transferRequest = {
        request_id: `req_${Date.now()}`,
        reason: "Top up Duffel balance",
        reference: "D3272AG2IV", // MUST match exactly
        transfer_currency: "EUR",

        beneficiary: {
          bank_details: {
            account_name: "Duffel Technology Limited",
            account_number: "14703154",
            sort_code: "185008",
            iban: "GB07CITI18500814703154",
            bic_swift: "CITIGB2LXXX",
            bank_name: "Citibank N.A. London",
            bank_address: {
              address_line1: "Citigroup Ctr 25 Canada Sq",
              city: "London",
              country_code: "GB",
              postcode: "E14 5LB",
            },
          },
          address: {
            country_code: "GB",
          },
        },

        source_currency: currency || "EUR", // e.g. "USD", "JPY"
        source_amount: amount, // or use transfer_amount if already GBP

        transfer_method: "bank_transfer",
      };

      const transfer =
        await airwallex.payouts.transfers.createTransfer(transferRequest);

      console.log("Duffel transfer: ", transfer);

      return transfer;
    } catch (e) {
      console.error("transfer airwallex error: ", e);
      return null;
    }
  },
};

module.exports = { customer, paymentIntent, transfer };
