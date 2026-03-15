const router = require("express").Router();
const controllers = require("../../controllers/user/currency");

router.get("/convert", controllers.convert);

module.exports = router;
