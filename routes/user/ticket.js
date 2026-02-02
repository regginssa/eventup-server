const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/ticket");

router.get("/all", controller.getAll);
router.get("/:id", controller.getById);

module.exports = router;
