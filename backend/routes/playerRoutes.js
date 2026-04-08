const express = require("express");
const controller = require("../controllers/playerController");

const router = express.Router();

router.get("/", controller.getPlayers);
router.get("/:id", controller.getPlayerById);

module.exports = router;
