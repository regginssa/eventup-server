const Booking = require("../../models/Booking");
const Transaction = require("../../models/Transaction");
const { getIO } = require("../../socket");

const webhook = async (req, res) => {
  try {
    const tx = req.body;
    console.log("[cryptocurrency checkout webhook data]: ", tx);

    if (!tx) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid request data" });
    }

    const { txHash, currency, amount, metadata } = tx;

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

        const io = getIO();
        io.to(booking.user.toString()).emit("booking_payment_status_updated", {
          bookingId: booking._id,
          status: booking.status,
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
