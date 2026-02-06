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

      socket.emit("dm_created", convo);
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

  // --- Fetch messages ---
  socket.on("get_messages", async (conversationId) => {
    try {
      const messages = await Message.find({ conversation: conversationId })
        .populate("sender")
        .sort({ createdAt: 1 });

      socket.emit("messages_list", messages);
    } catch (err) {
      console.log("Fetch messages error:", err);
    }
  });

  // --- Join the conversation room ---
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation: ${conversationId}`);
  });

  // --- Leave the conversation room ---
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
    console.log(`User left conversation: ${conversationId}`);
  });
};
