const Notification = require("../../models/Notification");

module.exports = (io, socket) => {
  // Send new notification
  socket.on("send_notification", async (data) => {
    try {
      const { notificationId, userId } = data;
      const notification =
        await Notification.findById(notificationId).populate("user");
      if (!notification) return;
      io.to(userId.toString()).emit("notification_sent", {
        notification,
        userId,
      });
    } catch (err) {
      socket.emit("send_notification_error", "Failed to send message");
    }
  });
};
