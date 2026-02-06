const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");

module.exports = (io, socket) => {
  socket.on("send_message", async (data) => {
    try {
      const { conversationId, senderId, text, files } = data;

      // 1. Create Message
      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text,
        files,
      });

      // 2. Update Conversation lastMessage
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
      });

      const populated = await Message.findById(message._id)
        .populate("sender")
        .lean();

      // 3. Emit to room
      io.to(conversationId).emit("new_message", populated);
    } catch (err) {
      console.log("Message Error:", err);
      socket.emit("message_error", "Failed to send message");
    }
  });

  // Update message status - seen
  socket.on("mark_message_seen", async ({ conversationId, userId }) => {
    try {
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          status: "sent",
        },
        { status: "seen" },
      );

      // notify sender
      io.to(conversationId).emit("messages_seen", { conversationId });
    } catch (err) {
      console.log("Seen update error:", err);
    }
  });
};
