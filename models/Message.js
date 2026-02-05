const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // text message
    text: { type: String, default: "" },

    // files (images, video, docs, voice)
    files: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "audio", "file"],
        },
      },
    ],

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", MessageSchema);
