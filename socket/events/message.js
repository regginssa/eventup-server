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

      // 3. Emit to room
      io.to(conversationId).emit("new_message", message);
    } catch (err) {
      console.log("Message Error:", err);
      socket.emit("message_error", "Failed to send message");
    }
  });

  // Update message status - delivered & seen
  socket.on("update_message_status", async ({ messageId, status }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status },
        { new: true },
      );

      io.to(message.conversation.toString()).emit(
        "message_status_updated",
        message,
      );
    } catch (err) {
      console.log("Status update error:", err);
    }
  });
};
