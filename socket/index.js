module.exports = (io) => {
  io.on("connection", (socket) => {
    // socket.on("user_connected", async (userId) => {
    //   if (userId) {
    //     await saveUserSocket(userId, socket.id);
    //     await onlineUser(userId);
    //     console.log("connected socket uesr id is online: ", userId);
    //   }
    // });
    // socket.on("disconnect", async () => {
    //   if (!socket.id) return;
    //   const userId = await getSocketUserId(socket.id);
    //   if (!userId) return;
    //   await offlineUser(userId);
    //   console.log("socket disconnect user id is offline: ", userId);
    // });
  });
};
