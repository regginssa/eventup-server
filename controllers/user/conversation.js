const Conversation = require("../../models/Conversation");

const getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.params.userId,
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

module.exports = { getUserConversations };
