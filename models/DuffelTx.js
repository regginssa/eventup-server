const mongoose = require("mongoose");
const DuffelTxSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "EUR" },
    reference: { type: String, required: true },
    transferId: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DuffelTx", DuffelTxSchema);
