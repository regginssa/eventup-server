const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/user");

router.get("/:id", controllers.get);
router.patch("/:id", controllers.update);

module.exports = router;
