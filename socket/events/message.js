const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");

module.exports = (io, socket) => {
  // Send new message
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
      const convo = await Conversation.findById(conversationId);

      // Increment unread count for everyone except sender
      convo.participants.forEach((userId) => {
        if (userId.toString() !== senderId) {
          const current = convo.unread.get(userId.toString()) || 0;
          convo.unread.set(userId.toString(), current + 1);
        }
      });

      convo.lastMessage = message._id;
      await convo.save();

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

      // reset unread count
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unread.${userId}`]: 0 },
      });

      // notify sender
      io.to(conversationId).emit("messages_seen", { conversationId, userId });
    } catch (err) {
      console.log("Seen update error:", err);
    }
  });

  socket.on("update_message", async ({ updates, conversationId }) => {
    try {
      const message = await Message.findById(updates._id);

      if (!message.isEdited) {
        message.set(updates);
        await message.save();
      }

      const populated = await Message.findById(message._id)
        .populate("sender")
        .lean();

      io.to(conversationId).emit("message_updated", populated);
    } catch (error) {
      console.error("[update message error]: ", error);
    }
  });

  socket.on("remove_message", async ({ messageId, conversationId }) => {
    try {
      // Check if message is existed
      const message = await Message.findById(messageId);

      if (message) {
        await message.deleteOne();
      }

      // notify all
      io.to(conversationId).emit("message_removed", {
        messageId,
        conversationId,
      });
    } catch (error) {
      console.error("[socket remove message error]: ", error);
    }
  });

  socket.on("remove_messages", async ({ ids, conversationId, userId }) => {
    const conv = await Conversation.findById(conversationId);
    if (!conv || conv?.type !== "dm") return;

    const otherUserId = conv.participants.find((p) => p.toString() !== userId);
    io.to(conversationId).emit("messages_removed", {
      ids,
      conversationId,
      userId: otherUserId,
    });
  });
};
