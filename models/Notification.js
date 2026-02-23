const mongoose = require("mongoose");
const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "new_event",
        "new_attendees",
        "event_update",
        "ticket_purchase",
        "event_ticket_released",
        "event_ticket_refunded",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: { type: String, default: null },
    link: { type: String, default: null },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", NotificationSchema);
