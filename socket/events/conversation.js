const Conversation = require("../../models/Conversation");

module.exports = (io, socket) => {
  // --- Create DM conversation ---
  socket.on("create_dm", async ({ user1Id, user2Id }) => {
    try {
      let convo = await Conversation.findOne({
        type: "dm",
        participants: { $all: [user1Id, user2Id] },
      });

      if (!convo) {
        convo = await Conversation.create({
          type: "dm",
          participants: [user1Id, user2Id],
        });
      }

      const populated = await Conversation.findById(convo._id)
        .populate("participants", "name avatar status blockedUsers")
        .populate("lastMessage")
        .lean();

      socket.emit("dm_created", populated);
    } catch (err) {
      console.log("DM error:", err);
    }
  });

  // --- Create GROUP conversation ---
  socket.on("create_group", async ({ name, avatar, participants }) => {
    try {
      const convo = await Conversation.create({
        type: "group",
        name,
        avatar,
        participants,
      });

      socket.emit("group_created", convo);
    } catch (err) {
      console.log("Group create error:", err);
    }
  });

  // --- Update conversation ---
  socket.on("update_conversation", async ({ conversationId, userId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate("participants", "name avatar status blockedUsers")
        .populate("creator", "name avatar status")
        .populate("event")
        .populate("lastMessage");

      if (!conversation) return;

      const participants = conversation.participants.map((p) =>
        p._id.toString(),
      );

      participants.forEach((pid) => {
        if (pid !== userId) {
          io.to(pid).emit("conversation_updated", conversation);
        }
      });
    } catch (err) {
      console.error("[update conversation socket error]: ", err);
    }
  });

  // --- Delete a conversation ---
  socket.on(
    "delete_conversation",
    async ({ conversationId, action, userId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) return;

        if (action === "me") {
          const alreadyHidden = conversation.hiddenFor.includes(userId);

          if (!alreadyHidden) {
            conversation.hiddenFor.push(userId);
            await conversation.save();
          }

          io.to(userId).emit("conversation_deleted", conversationId);
        } else {
          await conversation.deleteOne();

          conversation.participants.forEach((uid) =>
            io.to(uid.toString()).emit("conversation_deleted", conversationId),
          );
        }
      } catch (err) {
        console.error("[socket delete conversation for me error]: ", err);
      }
    },
  );

  // --- Block DM ---
  socket.on("block_dm", async ({ userId, conversationId }) => {
    const conv = await Conversation.findById(conversationId);
    if (!conv || conv?.type !== "dm") return;

    io.to(conversationId).emit("dm_blocked", { userId, conversationId });
  });

  // --- Unblock DM ---
  socket.on("unblock_dm", async ({ userId, conversationId }) => {
    const conv = await Conversation.findById(conversationId);
    if (!conv || conv?.type !== "dm") return;

    io.to(conversationId).emit("dm_unblocked", { userId, conversationId });
  });
};
