const Event = require("../../models/Event");

const getFeeds = async (req, res) => {
  try {
    const { userId, page, limit } = req.query;
    const pageNum = parseInt(page) || 0;
    const lim = parseInt(limit) || 10;

    const [events, total] = await Promise.all([
      Event.find()
        .skip(pageNum * lim)
        .limit(lim)
        .lean(),
      Event.countDocuments(),
    ]);

    return res.status(200).json({
      ok: true,
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: lim,
          total,
          hasMore: (pageNum + 1) * lim < total,
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
