const Ticket = require("../../models/Ticket");

const get = async (req, res) => {
  try {
    const tickets = await Ticket.find().lean();
    res.status(200).json({ ok: true, data: tickets });
  } catch (error) {
    console.error("[get tickets error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { get };
