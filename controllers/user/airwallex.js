const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const Notification = require("../../models/Notification");
const Booking = require("../../models/Booking");
const crypto = require("crypto");
const service = require("../../services/airwallex");
const { getIO } = require("../../socket");

const webhook = async (req, res) => {
  try {
    const timestamp = req.headers["x-timestamp"];
    const signature = req.headers["x-signature"];
    const rawBody = req.body.toString();
    const secret = process.env.AIRWALLEX_WEBHOOK_ID;

    const payload = timestamp + rawBody;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json();
    }

    const event = JSON.parse(rawBody);
    const intent = event.data.object;
    const metadata = JSON.parse(intent.merchant_order_id);
    console.log("airwallex webhook metadata: ", metadata);

    if (!metadata) return res.status(400).json();

    switch (event.name) {
      case "payment_intent.succeeded":
        if (!metadata.userId) break;
        const io = getIO();
        const user = await User.findById(metadata.userId);
        if (!user) break;

        switch (metadata.type) {
          case "ticket":
            user.tickets.push(metadata.ticketId);
            await user.save();

            await Transaction.create({
              type: "buy",
              service: "ticket",
              amount,
              currency,
              status: "completed",
              amountReceived,
              metadata,
              txId: id,
              paymentMethod: "credit",
              userId: user._id,
            });

            const ticketNotification = await Notification.create({
              type: "new_ticket_purchased",
              metadata: {
                ticketId: metadata.ticketId,
              },
              title: "Ticket purchased successfully",
              body: `Your ticket purchase was successful. You can now view your ticket in the My Tickets section.`,
              isRead: false,
              isArchived: false,
              user: user._id.toString(),
              link: `/mine/tickets`,
            });

            io.to(user._id.toString()).emit("notification_sent", {
              notification: ticketNotification,
              userId: user._id.toString(),
            });

            break;

          case "subscription":
            user.subscription = {
              id: metadata.subscriptionId,
              startedAt: new Date().toISOString().split("T")[0],
            };
            await user.save();

            await Transaction.create({
              type: "buy",
              service: "subscription",
              amount,
              currency,
              status: "completed",
              amountReceived,
              metadata,
              txId: id,
              paymentMethod: "credit",
              userId: user._id,
            });

            const subscriptionNotification = await Notification.create({
              type: "subscription_activated",
              metadata: {
                subscriptionId: metadata.subscriptionId,
              },
              title: "Subscription activated",
              body: `Your subscription is now active. Enjoy all premium features!`,
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

          case "booking":
            await Transaction.create({
              type: "buy",
              service: "booking",
              amount,
              currency,
              status: "completed",
              amountReceived,
              metadata,
              txId: id,
              paymentMethod: "credit",
              userId: user._id,
            });

            const booking = await Booking.findById(metadata.bookingId);
            if (!booking) return;
            booking.paymentStatus = "completed";
            await booking.save();

            const bookingNotification = await Notification.create({
              type: "booking_payment_completed",
              metadata: {
                bookingId: booking._id,
              },
              title: "Booking payment confirmed",
              body: `Your booking payment was successful. Your reservation is now confirmed.`,
              isRead: false,
              isArchived: false,
              user: user._id.toString(),
              link: `/booking/status`,
            });

            io.to(user._id.toString()).emit("notification_sent", {
              notification: bookingNotification,
              userId: user._id.toString(),
            });

            io.to(user._id.toString()).emit("booking_payment_status_updated", {
              bookingId: booking._id,
              status: "completed",
            });
            break;
        }

        break;

      case "payment_intent.failed":
        console.log("❌ Payment failed");
        break;

      default:
        console.log("Unhandled event:", event.name);
    }

    res.status(200).json();
  } catch (e) {
    console.error("airwallex webhook error: ", e);
  }
};

const customer = {
  create: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.json({ ok: false, message: "User not found" });
      }

      const { email, firstName, lastName } = user;

      const customerId = await service.customer.create({
        email,
        firstName,
        lastName,
        userId: user._id.toString(),
      });

      if (!customerId) {
        return res.json({ ok: false, data: null });
      }

      const pit = await service.paymentIntent.create({
        amount: 0,
        currency: "USD",
        customerId,
      });

      if (!pit) {
        return res.json({ ok: false, data: null });
      }

      user.airwallexCustomerId = customerId;
      await user.save();
      res.json({ ok: true, data: pit });
    } catch (e) {
      res.status(500).json({ ok: false, messaeg: "internal server error" });
    }
  },
};

const paymentIntent = {
  create: async (req, res) => {
    try {
      const pit = await service.paymentIntent.create(req.body);
      res.json({ ok: true, data: pit });
    } catch (e) {
      console.error("airwallex create payment error: ", e);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  },
};

module.exports = { webhook, customer, paymentIntent };
