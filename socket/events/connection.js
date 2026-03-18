const User = require("../../models/User");
const Subscription = require("../../models/Subscription");
const Notification = require("../../models/Notification");
const Conversation = require("../../models/Conversation");

module.exports = (io, socket) => {
  // --- User connects ---
  socket.on("user_connected", async (userId) => {
    socket.join(userId);

    const user = await User.findById(userId);

    if (!user) return;

    if (user.subscription) {
      const { id: subId, startedAt } = user.subscription;

      if (!startedAt) return;
      const subscription = await Subscription.findById(subId);
      if (!subscription) return;

      const subMonth = subscription.month;
      const expireDate = new Date(startedAt);
      expireDate.setMonth(expireDate.getMonth() + subMonth);

      const now = new Date();

      if (now > expireDate) {
        const subs = await Subscription.find().lean();
        user.subscription = {
          id: subs[0]._id.toString(),
          startedAt: null,
        };

        const notification = await Notification.create({
          type: "subscription_expired",
          metadata: {
            subId: subs[0]._id,
          },
          title: "Your subscription has expired",
          body: `Hi ${user?.name}, your subscription has expired. Renew it anytime to continue enjoying all premium features.`,
          isRead: false,
          isArchived: false,
          user: userId,
          link: `/subscription`,
        });

        io.to(userId.toString()).emit("notification_sent", {
          notification,
          userId,
        });

        io.to(userId.toString()).emit("subscription_expired", {
          freeSubId: subs[0]._id,
          userId,
        });
      }
    }

    user.status = "online";
    await user.save();

    const convs = await Conversation.find({
      participants: { $in: [socket.userId] },
    }).lean();

    for (const conv of convs) {
      io.to(conv._id.toString()).emit("one_user_status_updated", {
        userId,
        status: "online",
      });
    }
  });

  // --- User disconnects ---
  socket.on("disconnect", async () => {
    if (!socket.userId) return;
    socket.leave(socket.userId);

    const user = await User.findById(socket.userId);
    if (!user) return;

    user.status = "offline";
    await user.save();

    const convs = await Conversation.find({
      participants: { $in: [socket.userId] },
    }).lean();

    for (const conv of convs) {
      io.to(conv._id.toString()).emit("one_user_status_updated", {
        userId: user._id.toString(),
        status: "offline",
      });
    }

    socket.userId = null;
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
