const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/subscription");

router.get("/all", controllers.getAll);
router.get("/:id", controllers.getById);

module.exports = router;
