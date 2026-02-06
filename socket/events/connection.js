module.exports = (io, socket) => {
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
