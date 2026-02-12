const Ticket = require("../../models/Ticket");

const getAll = async (req, res) => {
  try {
    const tickets = await Ticket.find().lean();
    res.status(200).json({ ok: true, data: tickets });
  } catch (error) {
    console.error("[get tickets error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const get = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: "Ticket not found" });
    }

    res.status(200).json({ ok: true, data: ticket });
  } catch (error) {
    console.error("[get ticket by id error: ]", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getAll, get };
