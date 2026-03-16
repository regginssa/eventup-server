const User = require("../../models/User");

module.exports = (io, socket) => {
  // --- User connects ---
  socket.on("user_connected", async (userId) => {
    socket.join(userId);
    await User.findByIdAndUpdate(userId, { $set: { status: "online" } });
  });

  // --- User disconnects ---
  socket.on("disconnect", async () => {
    if (!socket.userId) return;
    socket.leave(socket.userId);
    io.emit("user_offline", socket.userId);
    socket.userId = null;
    await User.findByIdAndUpdate(socket.userId, {
      $set: { status: "offline" },
    });
  });

  // --- Join the conversation room ---
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  // --- Leave the conversation room ---
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
  });
};
