const { Duffel } = require("@duffel/api");
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

const duffel = new Duffel({
  token: ACCESS_TOKEN,
});

const create = async ({ amount, currency }) => {
  try {
    const res = await duffel.paymentIntents.create({
      data: { amount: amount.toString(), currency: currency },
    });

    if (!res.data) return null;

    const { client_token, id } = res.data;

    return {
      paymentIntentsId: id,
      clientToken: client_token,
    };
  } catch (e) {
    console.error("create duffel payment intent error: ", e);
    return null;
  }
};

module.exports = { create };
