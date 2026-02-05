const Message = require("../../models/Message");

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

module.exports = { getConversationMessages };
