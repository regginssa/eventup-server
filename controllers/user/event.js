const User = require("../../models/User");
const Event = require("../../models/Event");
const { filterPreferredEvents } = require("../../utils/preferred");

const getFeeds = async (req, res) => {
  try {
    const { userId, page, limit } = req.query;
    const pageNum = parseInt(page) || 0;
    const lim = parseInt(limit) || 10;

    if (!userId) {
      const events = await Event.find()
        .skip(pageNum * lim)
        .limit(lim)
        .lean();
      return res.status(200).json({
        ok: true,
        data: {
          events,
          pagination: {
            page: pageNum,
            limit: lim,
            total: events.length,
            filtered: events.length,
          },
        },
      });
    }

    const user = await User.findById(userId).lean();
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    // Fetch all events first (we'll paginate after filtering)
    const allEvents = await Event.find().lean();

    // Filter events based on user preferences
    const preferredEvents = await filterPreferredEvents(
      user.preferred,
      allEvents,
      user.location,
      pageNum,
      lim
    );

    res.status(200).json({
      ok: true,
      data: {
        events: preferredEvents,
        pagination: {
          page: pageNum,
          limit: lim,
          total: allEvents.length,
          filtered: preferredEvents.length,
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
