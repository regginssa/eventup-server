const zeroDecimalCurrencies = [
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "XAF",
  "XOF",
  "KMF",
  "PYG",
  "RWF",
  "UGX",
];

const convertCurrency = async (amount, from, to = "EUR") => {
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${from?.toUpperCase()}`,
    );
    const data = await res.json();

    const rate = data.rates[to?.toUpperCase() || "EUR"];
    const result = Number(amount) * rate;
    const rounded = Number(result);
    return rounded;
  } catch (error) {
    console.error("[covert currency error]: ", error);
    return 0;
  }
};

function calculateStripeAmount(amount, currency) {
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

module.exports = { calculateStripeAmount, convertCurrency };
