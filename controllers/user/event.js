const Event = require("../../models/Event");
const User = require("../../models/User");
const { checkPurchasesOneShot } = require("../../services/impact");
const { buildFeedPipeline } = require("../../utils/event");

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

    const query = { type, hoster: { $ne: null } }; // type always required

    const isValid = (v) =>
      v !== undefined && v !== null && v !== "" && v !== "undefined";

    if (isValid(startDate)) query["dates.start.date"] = startDate;
    if (isValid(countryCode)) query["location.country.code"] = countryCode;
    if (isValid(regionCode)) query["location.region.code"] = regionCode;
    if (isValid(category)) query["classifications.category"] = category;

    const hasSearchFilters =
      isValid(startDate) ||
      isValid(countryCode) ||
      isValid(regionCode) ||
      isValid(category);

    /**
     * CASE 1
     * NO USER
     */
    if (!userId) {
      const [events, total] = await Promise.all([
        Event.find(query)
          .sort({ "dates.start.date": 1 })
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
    }

    /**
     * CASE 2
     * USER + SEARCH FILTERS
     */
    if (hasSearchFilters) {
      const [events, total] = await Promise.all([
        Event.find(query)
          .sort({ "dates.start.date": 1 })
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
    }

    /**
     * CASE 3
     * PERSONALIZED FEED
     */
    const user = await User.findById(userId).lean();

    const pipeline = [
      { $match: { type } }, // important: filter ai/user events first
      ...buildFeedPipeline(user),
      { $skip: pageNum * lim },
      { $limit: lim },
    ];

    const events = await Event.aggregate(pipeline);

    const total = await Event.countDocuments({ type });

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
    const events = await Event.find().lean();
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

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const MAX_WAIT = 120_000; // 2 minutes
    const INTERVAL = 10_000; // poll every 10 seconds
    const startTime = Date.now();

    const poll = async () => {
      const actions = await checkPurchasesOneShot(userId);

      if (actions.length > 0) {
        const action = actions[0];

        const officialTicket = {
          userId: action.SubId1,
          ticketmasterOrderId: action.Oid,
          impactActionId: action.Id,
          status: action.ActionStatus,
          amount: action.Amount,
          currency: action.Currency,
          purchasedAt: action.CreationDate,
        };

        event.officialTicket = officialTicket;
        await event.save();

        return res.status(200).json({
          ok: true,
          data: { found: true },
        });
      }

      // timeout?
      if (Date.now() - startTime > MAX_WAIT) {
        return res.status(200).json({
          ok: true,
          data: { found: false, message: "Not found yet" },
        });
      }

      // wait and poll again
      setTimeout(poll, INTERVAL);
    };

    poll();
  } catch (err) {
    console.error(err);
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
