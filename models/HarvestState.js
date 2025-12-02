const mongoose = require("mongoose");

const HarvestStateSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  cursorIso: { type: String },
  lastEventId: { type: String, default: null },
  lockedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HarvestState", HarvestStateSchema);
