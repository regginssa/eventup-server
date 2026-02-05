const Message = require("../../models/Message");

const getConversationMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    }).populate("sender");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

module.exports = { getConversationMessages };
