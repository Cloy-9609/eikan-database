const express = require("express");
const controller = require("../controllers/schoolController");

const router = express.Router();

router.get("/", controller.getSchools);
router.get("/:id", controller.getSchoolById);

module.exports = router;
