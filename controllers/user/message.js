const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");

const getConversationMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate("sender")
      .lean();

    res.status(200).json({ ok: true, data: messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const markSeen = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    console.log(conversationId, userId);

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        status: "sent",
      },
      { status: "seen" },
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unread.${userId}`]: 0 },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[mark seen error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const message = await Message.findById(id);
    message.set(updates);
    await message.save();

    res.status(200).json({ ok: true, data: message });
  } catch (error) {
    console.error("[message update error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const removeOne = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);

    res.status(200).json({ ok: true, data: true });
  } catch (error) {
    console.error("[message delete error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const removeMany = async (req, res) => {
  try {
    const { ids } = req.body;
    await Message.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ ok: true, data: true });
  } catch (error) {
    console.error("[remove many messages error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  getConversationMessages,
  markSeen,
  update,
  removeOne,
  removeMany,
};
