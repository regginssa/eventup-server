const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

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
        .populate("participants", "name avatar status")
        .populate("lastMessage")
        .lean();

      socket.emit("dm_created", populated);
    } catch (err) {
      console.log("DM error:", err);
    }
  });

  // --- Create Group Conversation ---
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

  // -- Delete a conversation
  socket.on(
    "delete_dm_conversation",
    async ({ conversationId, action, userId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (conversation) {
          if (action === "me") {
            const alreadyHidden = conversation.hiddenFor.includes(userId);

            if (!alreadyHidden) {
              conversation.hiddenFor.push(userId);
              await conversation.save();
            }

            io.to(userId).emit("conversation_dm_deleted", conversationId);
          } else {
            await conversation.deleteOne();

            conversation.participants.forEach((uid) =>
              io
                .to(uid.toString())
                .emit("conversation_dm_deleted", conversationId),
            );
          }
        }
      } catch (err) {
        console.error("[socket delete conversation for me error]: ", err);
      }
    },
  );
};
