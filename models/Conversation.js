const mongoose = require("mongoose");
const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["dm", "group"],
      required: true,
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Groups only
    name: String,
    avatar: String,

    // Latest message for preview list
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    unread: {
      type: Map,
      of: Number, // key: userId, value: unread count
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Conversation", ConversationSchema);
