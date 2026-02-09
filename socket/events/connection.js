module.exports = (io, socket) => {
  // --- User connects ---
  socket.on("user_connected", (userId) => {
    socket.join(userId);
    console.log(`User connected: ${userId}`);
  });

  // --- User disconnects ---
  socket.on("disconnect", () => {
    if (!socket.userId) return;
    console.log("User disconnected:", socket.userId);
    socket.leave(socket.userId);
    io.emit("user_offline", socket.userId);
    socket.userId = null;
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
