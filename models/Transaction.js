const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "crypto", "token"],
      default: "credit",
    },
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
      enum: ["created", "pending", "completed", "failed"],
    },
    metadata: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", TransactionSchema);
