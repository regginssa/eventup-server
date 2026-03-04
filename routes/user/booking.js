const router = require("express").Router();
const controllers = require("../../controllers/user/booking");

router.get("/:id", controllers.get);
router.post("/", controllers.create);
router.patch("/:id", controllers.update);
router.delete("/:id", controllers.remove);
router.get("/user-event/:userId/:eventId", controllers.getByUserIdAndEventId);
router.get("/all/:userId", controllers.getAllByUserId);

module.exports = router;
