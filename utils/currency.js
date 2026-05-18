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

const getCurrencyRate = async (from, to = "EUR") => {
  try {
    if (from === to) {
      return 1;
    }
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${from?.toUpperCase()}`,
    );
    const data = await res.json();

    const rate = data.rates[to?.toUpperCase() || "EUR"];
    return rate;
  } catch (error) {
    console.error("[get currency rate error]: ", error);
    return 0;
  }
};

const getEURByRate = async (amount, rate) => {
  const result = Number(amount) * rate;
  const rounded = Number(result);
  return rounded;
};

const convertCurrency = async (amount, from, to = "EUR") => {
  try {
    if (from === to) {
      return Number(amount);
    }
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

function calculateStripeAmount(amount, currency = "EUR") {
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

module.exports = {
  calculateStripeAmount,
  getCurrencyRate,
  getEURByRate,
  convertCurrency,
};
