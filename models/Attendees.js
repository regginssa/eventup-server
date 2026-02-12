const mongoose = require("mongoose");
const TicketSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    status: {
      type: String,
      enum: ["deposited", "released", "refunded"],
      default: "deposited",
    },
  },
  { _id: false },
);

const AttendeesSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    ticket: TicketSchema,
    status: {
      type: String,
      enum: ["approved", "blocked"],
      default: "approved",
    },
  },
  { timestamps: true },
);

module.exports = mongose.model("Attendees", AttendeesSchema);
