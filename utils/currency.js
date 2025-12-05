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

function calculateStripeAmount(amount, currency) {
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount); // no * 100
  }
  return Math.round(amount * 100);
}

module.exports = { calculateStripeAmount };
