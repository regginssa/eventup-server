const { Server } = require("socket.io");
const registerConnectionEvents = require("./events/connection");
const registerConversationEvents = require("./events/conversation");
const registerMessageEvents = require("./events/message");
const registerNotificationEvents = require("./events/notification");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    registerConnectionEvents(io, socket);
    registerConversationEvents(io, socket);
    registerMessageEvents(io, socket);
    registerNotificationEvents(io, socket);
  });
}

module.exports = { initSocket, getIO: () => io };
