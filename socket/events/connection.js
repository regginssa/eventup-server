module.exports = (io, socket) => {
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined room: ${conversationId}`);
  });
};
