const Booking = require("../../models/Booking");
const Transaction = require("../../models/Transaction");
const Ticket = require("../../models/Ticket");
const User = require("../../models/User");
const Subscription = require("../../models/Subscription");
const Notification = require("../../models/Notification");
const web3Service = require("../../services/web3");
const flightService = require("../../services/flight");
const hotelService = require("../../services/hotel");
const transferService = require("../../services/transfer");
const { getIO } = require("../../socket");

const webhook = async (req, res) => {
  try {
    const tx = req.body;

    if (!tx) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid request data" });
    }

    const { txHash, currency, amount, metadata, to: userWalletAddress } = tx;
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

        booking.paymentStatus = "completed";
        const { flight, hotel } = booking;
        const { airportToHotel, hotelToEvent } = booking.transfer;
        let captureAmount = Number(Number(amount).toFixed(6));
        const chain = currency.includes("eth") ? "ETH" : "SOL";
        const token = currency;

        if (
          flight?.offer &&
          (!flight?.booking || flight?.status === "failed")
        ) {
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
            captureAmount -= booking.price.breakdown.flight;
            await web3Service.refund({
              chain,
              token,
              amount: booking.price.breakdown.flight,
              to: userWalletAddress,
            });
            booking.price.breakdown.flight = 0;
          }
          await booking.save();
          io.to(user._id.toString()).emit("booking_changed", {
            booking,
            amount: Number(captureAmount.toFixed(6)),
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
            captureAmount -= booking.price.breakdown.hotel;
            await web3Service.refund({
              chain,
              token,
              amount: booking.price.breakdown.hotel,
              to: userWalletAddress,
            });
            booking.price.breakdown.hotel = 0;
          }
          await booking.save();
          io.to(user._id.toString()).emit("booking_changed", {
            booking,
            amount: Number(captureAmount.toFixed(6)),
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
            captureAmount -= booking.price.breakdown.transferAirport;
            await web3Service.refund({
              chain,
              token,
              amount: booking.price.breakdown.transferAirport,
              to: userWalletAddress,
            });
            booking.price.breakdown.transferAirport = 0;
          }
          await booking.save();
          io.to(user._id.toString()).emit("booking_changed", {
            booking,
            amount: Number(captureAmount.toFixed(6)),
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
            captureAmount -= booking.price.breakdown.transferEvent;
            await web3Service.refund({
              chain,
              token,
              amount: booking.price.breakdown.transferEvent,
              to: userWalletAddress,
            });
            booking.price.breakdown.transferEvent = 0;
          }
          await booking.save();
          io.to(user._id.toString()).emit("booking_changed", {
            booking,
            amount: Number(captureAmount.toFixed(6)),
          });
        }

        if (metadata.isNewBooking === "true") {
          booking.price.totalAmount = Number(captureAmount.toFixed(6));
        } else {
          booking.price.totalAmount = Number(
            (booking.price.totalAmount + captureAmount).toFixed(6),
          );
        }
        await booking.save();

        await Transaction.create({
          type: "buy",
          service: "booking",
          amount: booking.price.totalAmount,
          currency,
          status: "completed",
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
          title: "Booking payment confirmed",
          body: `Your booking payment was successful. Your reservation is now confirmed.`,
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
