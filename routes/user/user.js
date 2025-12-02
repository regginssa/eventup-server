const express = require("express");
const router = express.Router();
const { updateUser, getUser } = require("../../controllers/user/user");

router.get("/:id", getUser);
router.patch("/:id", updateUser);

module.exports = router;
