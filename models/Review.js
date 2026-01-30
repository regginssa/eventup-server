const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    description: { type: String, default: null },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);
