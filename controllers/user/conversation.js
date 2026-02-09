const Conversation = require("../../models/Conversation");

const getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId,
      hiddenFor: { $ne: userId },
    })
      .populate("participants", "name avatar status")
      .populate("lastMessage")

      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ ok: true, data: conversations });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

const removeOne = async (req, res) => {
  try {
    const { id } = req.params;
    await Conversation.findByIdAndUpdate(id, {
      $addToSet: { hiddenFor: userId },
    });
    res.status(200).json({ ok: true, data: true });
  } catch (error) {
    console.error("[remove one conversation error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getUserConversations, removeOne };
