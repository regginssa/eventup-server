const router = require("express").Router();
const controllers = require("../../controllers/user/notification");

router.get("/:id", controllers.get);
router.get("/user/:id", controllers.getByUserId);
router.post("/", controllers.create);
router.patch("/:id", controllers.update);
router.patch("/read/bulk", controllers.markRead);
router.delete("/:id", controllers.remove);

module.exports = router;
