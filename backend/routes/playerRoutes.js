const express = require("express");
const controller = require("../controllers/playerController");

const router = express.Router();

router.get("/", controller.getPlayers);
router.get("/:id/detail", controller.getPlayerDetailById);
router.get("/:id", controller.getPlayerById);
router.post("/", controller.createPlayer);
router.put("/:id", controller.updatePlayer);

module.exports = router;
