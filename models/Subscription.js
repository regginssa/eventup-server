const mongoose = require("mongoose");
const SubscriptionSchema = new mongoose.Schema({
  month: { type: Number, enum: [0, 1, 3, 6, 12], default: 0 },
  price: { type: Number, default: 0 },
  currency: { type: String, default: "USD" },
  features: { type: [String], default: [] },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
