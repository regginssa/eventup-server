const Notification = require("../../models/Notification");

const get = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id).populate("user");
    if (!notification) {
      return res
        .status(404)
        .json({ ok: false, message: "Notification not found" });
    }
    res.status(200).json({ ok: true, data: notification });
  } catch (err) {
    console.log("[notification get error]: ", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    const notifications = await Notification.find({ user: userId })
      .populate("user")
      .lean();
    res.status(200).json({ ok: true, data: notifications });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const newNotification = await Notification.create(req.body);
    if (!newNotification) {
      return res
        .status(400)
        .json({ ok: false, message: "Create notification failed" });
    }
    const populated = await Notification.findById(newNotification._id).populate(
      "user",
    );
    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json({ ok: false, message: "Notification not found" });
    }
    notification.set(req.body);
    await notification.save();
    const populated = await Notification.findById(id).populate("user");
    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.status(200).json({ ok: true, data: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const markRead = async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { isRead: true } },
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  get,
  getByUserId,
  create,
  update,
  remove,
  markRead,
};
