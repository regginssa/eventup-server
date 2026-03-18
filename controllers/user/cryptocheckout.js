const Booking = require("../../models/Booking");
const Transaction = require("../../models/Transaction");
const Ticket = require("../../models/Ticket");
const User = require("../../models/User");
const Subscription = require("../../models/Subscription");
const Notification = require("../../models/Notification");
const { getIO } = require("../../socket");

const webhook = async (req, res) => {
  try {
    const tx = req.body;

    if (!tx) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid request data" });
    }

    const { txHash, currency, amount, metadata } = tx;
    const user = await User.findById(metadata.userId);

    const io = getIO();

    switch (metadata.type) {
      case "booking":
        const booking = await Booking.findById(metadata.bookingId);

        if (!booking) {
          return res
            .status(404)
            .json({ ok: false, message: "Booking not found" });
        }

        const isPartiallyPaid = booking.price.totalAmount > Number(amount);

        isPartiallyPaid
          ? (booking.paymentStatus = "partially_completed")
          : (booking.paymentStatus = "completed");

        await booking.save();

        await Transaction.create({
          type: "buy",
          service: "booking",
          amount: booking.price.totalAmount,
          currency,
          status: isPartiallyPaid ? "partially_completed" : "completed",
          amountReceived: Number(amount),
          metadata,
          txId: txHash,
          paymentMethod: "crypto",
          userId: booking.user.toString(),
        });

        const bookingNotification = await Notification.create({
          type: "booking_payment_completed",
          metadata: {
            bookingId: booking._id,
          },
          title: isPartiallyPaid
            ? "Partial payment received"
            : "Booking payment confirmed",
          body: isPartiallyPaid
            ? `We received a partial payment for your booking. Please complete the remaining payment to confirm it.`
            : `Your booking payment was successful. Your reservation is now confirmed.`,
          isRead: false,
          isArchived: false,
          user: booking.user.toString(),
          link: `/booking/status`,
        });

        io.to(booking.user.toString()).emit("notification_sent", {
          notification: bookingNotification,
          userId: booking.user.toString(),
        });

        io.to(booking.user.toString()).emit("booking_payment_status_updated", {
          bookingId: booking._id,
          status: booking.status,
        });

        break;

      case "ticket":
        user.tickets.push(metadata.ticketId);
        await user.save();

        const ticket = await Ticket.findById(metadata.ticketId);

        await Transaction.create({
          type: "buy",
          service: "ticket",
          amount: ticket.price,
          currency,
          status: "completed",
          amountReceived: Number(amount),
          metadata,
          txId: txHash,
          paymentMethod: "crypto",
          userId: user._id,
        });

        const ticketNotification = await Notification.create({
          type: "new_ticket_purchased",
          metadata: {
            ticketId: metadata.ticketId,
          },
          title: "Ticket purchased successfully",
          body: `Your ticket payment was successful. You can now view your ticket in My Tickets.`,
          isRead: false,
          isArchived: false,
          user: user._id.toString(),
          link: `/mine/tickets`,
        });

        io.to(user._id.toString()).emit("notification_sent", {
          notification: ticketNotification,
          userId: user._id.toString(),
        });

        io.to(user._id.toString()).emit("auth_user_updated", { user });
        break;

      case "subscription":
        user.subscription = {
          id: metadata.subscriptionId,
          startedAt: new Date().toISOString().split("T")[0],
        };
        await user.save();

        const subscription = await Subscription.findById(
          metadata.subscriptionId,
        );

        await Transaction.create({
          type: "buy",
          service: "subscription",
          amount: subscription.price,
          currency,
          status: "completed",
          amountReceived: Number(amount),
          metadata,
          txId: txHash,
          paymentMethod: "crypto",
          userId: user._id,
        });

        const subscriptionNotification = await Notification.create({
          type: "subscription_activated",
          metadata: {
            subscriptionId: metadata.subscriptionId,
          },
          title: "Subscription activated",
          body: `Your subscription payment was successful. You now have access to premium features.`,
          isRead: false,
          isArchived: false,
          user: user._id.toString(),
          link: `/subscription`,
        });

        io.to(user._id.toString()).emit("notification_sent", {
          notification: subscriptionNotification,
          userId: user._id.toString(),
        });

        io.to(user._id.toString()).emit("subscription_activated", {
          subId: user.subscription.id,
          startedAt: user.subscription.startedAt,
          userId: user._id.toString(),
        });
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("[cryptocheckout webhook error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { webhook };
