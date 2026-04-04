const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const Notification = require("../../models/Notification");
const Booking = require("../../models/Booking");
const {
  createCustomer,
  setupIntents,
  retrieveSetupIntentPaymentMethod,
  createPaymentIntent,
  refundPayment,
  createCapturePaymentIntent,
} = require("../../services/stripe");
const flightService = require("../../services/flight");
const hotelService = require("../../services/hotel");
const transferService = require("../../services/transfer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const stripeService = require("../../services/stripe");
const { getIO } = require("../../socket");
const { calculateStripeAmount } = require("../../utils/currency");

const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("[stripe webhook received]: ", event.type);

  const {
    id,
    metadata,
    currency,
    amount,
    amount_received: amountReceived,
  } = event.data.object;

  if (!metadata.userId) return res.json();
  const io = getIO();
  const user = await User.findById(metadata.userId);

  if (!user) {
    return res.json();
  }

  switch (event.type) {
    case "payment_intent.succeeded":
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
          const amountEUR = Number((Number(amount) / 100).toFixed(2));
          booking.paymentStatus = "completed";
          if (metadata.isNewBooking === "true") {
            booking.price.totalAmount = amountEUR;
          } else {
            booking.price.totalAmount += amountEUR;
          }
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

          io.to(user._id.toString()).emit("booking_changed", {
            booking,
          });
          break;
      }

      break;

    case "payment_intent.payment_failed":
      const failedIntent = event.data.object;
      console.log("Payment failed:", failedIntent.last_payment_error?.message);
      // ❌ Optional: notify user
      break;

    case "payment_intent.amount_capturable_updated":
      const { bookingId } = metadata;
      if (!bookingId) break;

      const booking = await Booking.findById(bookingId);
      if (!booking) break;

      const { flight, hotel } = booking;
      const { airportToHotel, hotelToEvent } = booking.transfer;
      let captureAmount = Number(amount);

      if (flight?.offer && (!flight?.booking || flight?.status === "failed")) {
        const { totalAmount, currency, id, passengerIds } = flight.offer;
        const result = await flightService.book({
          totalAmount,
          currency,
          offerId: id,
          passengers: [
            {
              id: passengerIds[0],
              type: "adult",
              given_name: user.firstName,
              family_name: user.lastName,
              born_on: user.birthday,
              gender: user.gender === "mr" ? "m" : "f",
              email: user.email,
              phone_number: user.phone,
              title: user.gender,
            },
          ],
        });

        booking.flight.booking = result;
        booking.flight.status = result.status;
        if (!result.reference) {
          captureAmount -= calculateStripeAmount(
            booking.price.breakdown.flight,
          );
          booking.price.breakdown.flight = 0;
          booking.flight.offer = null;
          booking.transfer.airportToHotel = null;
        }
        await booking.save();
        io.to(user._id.toString()).emit("booking_changed", {
          booking,
          amount: Number(Number(captureAmount / 100).toFixed(2)),
        });
      }

      if (hotel?.offer && (!hotel?.booking || hotel?.status === "failed")) {
        const { id } = hotel.offer;
        const result = await hotelService.book({
          quoteId: id,
          phoneNumber: user.phone,
          guestInfo: {
            given_name: user.firstName,
            family_name: user.lastName,
            born_on: user.birthday,
            email: user.email,
          },
        });
        booking.hotel.booking = result;
        booking.hotel.status = result.status;
        if (!result.reference) {
          captureAmount -= calculateStripeAmount(booking.price.breakdown.hotel);
          booking.price.breakdown.hotel = 0;
          booking.hotel.offer = null;
          booking.transfer.hotelToEvent = null;
        }
        await booking.save();
        io.to(user._id.toString()).emit("booking_changed", {
          booking,
          amount: Number(captureAmount / 100).toFixed(2),
        });
      }

      if (
        flight?.offer &&
        airportToHotel?.offer &&
        (!airportToHotel?.booking || airportToHotel?.status === "failed")
      ) {
        const result = await transferService.book({
          holder: {
            name: user.firstName,
            surname: user.lastName,
            email: user.email,
            phone: user.phone,
          },
          bookingId: `BOK_${booking._id.toString().slice(0, 8)}`,
          rateKey: airportToHotel.offer.rateKey,
          transferDetails: [
            {
              type: "FLIGHT",
              direction: airportToHotel.offer.rateKey.split("|")[0],
              code: flight.offer.slices[flight.offer.slices.length - 1]
                .destinationIata,
              companyName: flight.offer.airlineName,
            },
          ],
        });
        booking.transfer.airportToHotel.booking = result;
        booking.transfer.airportToHotel.status = result.status;
        if (!result.reference) {
          captureAmount -= calculateStripeAmount(
            booking.price.breakdown.transferAirport,
          );
          booking.price.breakdown.transferAirport = 0;
          booking.transfer.airportToHotel.offer = null;
        }
        await booking.save();
        io.to(user._id.toString()).emit("booking_changed", {
          booking,
          amount: Number(captureAmount / 100).toFixed(2),
        });
      }

      if (
        hotelToEvent?.offer &&
        (!hotelToEvent?.booking || hotelToEvent?.status === "failed")
      ) {
        const result = await transferService.book({
          holder: {
            name: user.firstName,
            surname: user.lastName,
            email: user.email,
            phone: user.phone,
          },
          bookingId: `BOK_${booking._id.toString().slice(0, 8)}`,
          rateKey: hotelToEvent.offer.rateKey,
          transferDetails: [
            {
              type: "FLIGHT",
              direction: hotelToEvent.offer.rateKey.split("|")[0],
              code: "N/A",
              companyName: "Event",
            },
          ],
        });
        booking.transfer.hotelToEvent.booking = result;
        booking.transfer.hotelToEvent.status = result.status;
        if (!result.reference) {
          captureAmount -= calculateStripeAmount(
            booking.price.breakdown.transferEvent,
          );
          booking.price.breakdown.transferEvent = 0;
          booking.transfer.hotelToEvent.offer = null;
        }
        await booking.save();
        io.to(user._id.toString()).emit("booking_changed", {
          booking,
          amount: Number(captureAmount / 100).toFixed(2),
        });
      }

      if (captureAmount > 0) {
        await stripeService.capturePaymentIntent(id, captureAmount);
      }

      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

const getCustomerId = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const customerId = await createCustomer(user.email, user.name);

    if (!customerId) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to create Stripe customer" });
    }

    user.stripe = {
      customerId,
      paymentMethods: [],
    };
    await user.save();

    res.status(200).json({ ok: true, data: customerId });
  } catch (error) {
    console.error("Error in getCustomerId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getClientSecret = async (req, res) => {
  try {
    const customerId = req.user.stripe.customerId;
    const clientSecret = await setupIntents(customerId);
    res.status(200).json({ ok: true, data: clientSecret });
  } catch (error) {
    console.error("Error in getClientSecret:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const saveStripePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { setupIntentClientSecret } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const paymentMethod = await retrieveSetupIntentPaymentMethod(
      setupIntentClientSecret,
    );

    if (!paymentMethod) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to retrieve payment method" });
    }

    user.stripe.paymentMethods.push({
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
      last4: paymentMethod.card.last4,
    });
    await user.save();

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("Error in saveStripePaymentMethod:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createStripePaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId, metadata: bodyMeta, amount, currency } = req.body;

    const user = await User.findById(userId);

    if (!user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const metadata = {
      userId: user._id.toString(),
      email: user.email,
      ...bodyMeta,
    };

    const customerId = user.stripe.customerId;

    if (!customerId) {
      return res
        .status(400)
        .json({ ok: false, message: "Payment method is not verified" });
    }

    const result = await createPaymentIntent(
      customerId,
      paymentMethodId,
      amount,
      currency,
      metadata,
    );

    if (!result?.clientSecret) {
      return res.status(500).json({ ok: false, message: result.message });
    }

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.log("pay stripe error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const createStripeCapturePaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId, metadata: bodyMeta, amount, currency } = req.body;

    const user = await User.findById(userId);

    if (!user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const metadata = {
      userId: user._id.toString(),
      email: user.email,
      ...bodyMeta,
    };

    const customerId = user.stripe.customerId;

    if (!customerId) {
      return res
        .status(400)
        .json({ ok: false, message: "Payment method is not verified" });
    }

    const result = await createCapturePaymentIntent(
      customerId,
      paymentMethodId,
      amount,
      currency,
      metadata,
    );

    if (!result?.clientSecret) {
      return res.status(500).json({ ok: false, message: result.message });
    }

    res.status(200).json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const refundStripePaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    await refundPayment(paymentIntentId);

    res.status(200).json({
      ok: true,
      message: "Your payment will be refunded within 3 or 4 business days",
    });
  } catch (error) {
    console.log("refund stripe payment intent: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  webhook,
  getCustomerId,
  getClientSecret,
  saveStripePaymentMethod,
  createStripePaymentIntent,
  createStripeCapturePaymentIntent,
  refundStripePaymentIntent,
};
