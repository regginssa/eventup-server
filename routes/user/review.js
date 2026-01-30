const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/review");

router.get("/to/:id", controller.getByTo);

module.exports = router;
