const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["buy", "sell"], default: "buy" },
    paymentMethod: {
      type: String,
      enum: ["credit", "crypto"],
      default: "credit",
    },
    payoutToken: { type: String, default: null },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    txId: { type: String, required: true },
    amount: { type: Number, default: 0 },
    amountReceived: { type: Number, default: 0 },
    currency: { type: String, required: true },
    service: {
      type: String,
      enum: ["ticket", "subscription", "booking"],
      default: "booking",
    },
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "completed",
        "failed",
        "partially_completed",
      ],
      default: "created",
    },
    metadata: { type: Object },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", TransactionSchema);
