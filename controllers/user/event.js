const Event = require("../../models/Event");
const mongoose = require("mongoose");
const { checkPurchases } = require("../../services/impact");

const getFeeds = async (req, res) => {
  try {
    const {
      userId,
      type,
      startDate,
      countryCode,
      regionCode,
      category,
      page,
      limit,
    } = req.query;

    const pageNum = Math.max(0, (parseInt(page) || 1) - 1);
    const lim = parseInt(limit) || 10;

    const query = {};

    const isValid = (v) =>
      v !== undefined && v !== null && v !== "" && v !== "undefined";

    if (type) query.type = type;

    if (isValid(startDate)) query["dates.start.date"] = startDate;
    if (isValid(countryCode)) query["location.country.code"] = countryCode;
    if (isValid(regionCode)) query["location.region.code"] = regionCode;
    if (isValid(category)) query["classifications.category"] = category;

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ _id: -1 })
        .skip(pageNum * lim)
        .limit(lim)
        .lean(),
      Event.countDocuments(query),
    ]);

    return res.status(200).json({
      ok: true,
      data: {
        events,
        pagination: {
          page: pageNum + 1,
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

const getAll = async (req, res) => {
  try {
    const events = await Event.find({}, "-__v").lean();
    res.status(200).json({ ok: true, data: events });
  } catch (error) {
    console.error("get all events error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const get = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ ok: false, message: "Something went wrong" });
    }

    // Validate that id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid event ID format" });
    }

    let event = await Event.findById(id).populate("hoster").populate({
      path: "attendees.user",
    });

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

const getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const events = await Event.find({ hoster: userId, status })
      .populate("hoster")
      .lean();
    res.status(200).json({ ok: true, data: events });
  } catch (error) {
    console.error("get event by user id error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const newEvent = await Event.create(req.body);
    res.status(200).json({ ok: true, data: newEvent });
  } catch (error) {
    console.error("create event error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event)
      return res.status(404).json({ ok: false, message: "Event not found" });
    event.set(req.body);
    await event.save();

    const populated = await Event.findById(id).populate("hoster").populate({
      path: "attendees.user",
    });

    res.status(200).json({ ok: true, data: populated });
  } catch (error) {
    console.error("[update event error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const checkTicketPurchase = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { userId } = req.query;

    const result = await checkPurchases(userId);

    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  getFeeds,
  getAll,
  get,
  getByUserId,
  create,
  update,
  checkTicketPurchase,
};
