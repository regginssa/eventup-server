const mongoose = require("mongoose");
const TicketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, default: 0 },
  currency: { type: String, required: true },
});

module.exports = mongoose.model("Ticket", TicketSchema);
