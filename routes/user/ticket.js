const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/ticket");

router.get("/all", controller.get);

module.exports = router;
