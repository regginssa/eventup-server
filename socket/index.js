const { Server } = require("socket.io");
const registerConnectionEvents = require("./events/connection");
const registerConversationEvents = require("./events/conversation");
const registerMessageEvents = require("./events/message");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerConnectionEvents(io, socket);
    registerConversationEvents(io, socket);
    registerMessageEvents(io, socket);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket, getIO: () => io };
