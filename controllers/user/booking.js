const Booking = require("../../models/Booking");

const get = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("user")
      .populate("event");

    if (!booking) {
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    res.status(200).json({ ok: true, data: booking });
  } catch (error) {
    console.error("get booking error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getByUserIdAndEventId = async (req, res) => {
  try {
    const { userId, eventId } = req.params;

    if (!userId || !eventId) {
      return res.status(401).json({ ok: false, message: "Invalid params" });
    }

    const booking = await Booking.findOne({
      user: userId,
      event: eventId,
    });

    res.status(200).json({ ok: true, data: booking });
  } catch (error) {
    console.error("[get booking by userId and eventId error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getAllByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: "event",
        populate: {
          path: "hoster",
          select: "name email avatar",
        },
      })
      .lean();

    res.status(200).json({ ok: true, data: bookings });
  } catch (error) {
    console.error("get all bookings by user id error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);

    console.log("[booking created]: ", booking);

    res.status(200).json({ ok: true, data: booking });
  } catch (error) {
    console.error("create booking error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
  } catch (error) {}
};

module.exports = {
  get,
  create,
  update,
  getByUserIdAndEventId,
  getAllByUserId,
};
