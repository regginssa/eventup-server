const dotenv = require("dotenv");
dotenv.config();

const PROD = process.env.IAP_PROD;
const SBX = process.env.IAP_SBX;

const verifyReceipt = async (receiptData) => {
  const payload = {
    "receipt-data": receiptData,
    "exclude-old-transactions": true,
  };

  const prodRes = await fetch(PROD, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const prod = await prodRes.json();

  // Sandbox receipt sent to production endpoint
  if (prod?.status === 21007) {
    const sbxRes = await fetch(SBX, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return sbxRes.json();
  }

  return prod;
};

module.exports = { verifyReceipt };
