const { findPersonalizedEvents } = require("../../utils/feed-query");
const User = require("../../models/User");
const Event = require("../../models/Event");
const { fetchEventDetailsFromTM } = require("../../services/ticketmaster");
const { upsertEventFromDiscovery } = require("../../utils/tm-update");

const getFeeds = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20)
    );

    const userId = req.query.userId || req.user?.id;
    if (!userId)
      return res.status(400).json({ ok: false, message: "Missing userId" });

    const user = await User.findById(userId).lean();
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    const { items, total } = await findPersonalizedEvents({
      user,
      page,
      limit,
    });

    res.status(200).json({
      ok: true,
      data: {
        events: items,
        pagination: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      },
    });
  } catch (err) {
    console.error("[feed] error:", err);
    res.status(500).json({ ok: false, message: "Internal Server Error" });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({}, "-__v").lean();
    res.status(200).json({ ok: true, data: events });
  } catch (error) {
    console.error("get all events error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ ok: false, message: "Something went wrong" });
    }

    let event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    // const discovery = await fetchEventDetailsFromTM(event.id);

    // if (discovery) {
    //   event = await upsertEventFromDiscovery(discovery);
    // }

    res.status(200).json({ ok: true, data: event });
  } catch (error) {
    console.error("get event error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getFeeds, getAllEvents, getEvent };
