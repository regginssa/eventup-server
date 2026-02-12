const Attendees = require("../../models/Attendees");

const getByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    const data = await Attendees.find({ event: eventId })
      .populate("user")
      .populate("event")
      .lean();
    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("[get attendees by event id error: ]", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const newAttendees = await Attendees.create(req.body);
    const populated = await Attendees.findById(newAttendees._id)
      .populate("user")
      .populate("event");
    res.status(200).json({ ok: true, data: populated });
  } catch (error) {
    console.error("[create attendees error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getByEventId, create };
