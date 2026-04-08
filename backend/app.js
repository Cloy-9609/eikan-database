const express = require("express");
const schoolRoutes = require("./routes/schoolRoutes");
const playerRoutes = require("./routes/playerRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use("/api/schools", schoolRoutes);
app.use("/api/players", playerRoutes);
app.use(errorHandler);

module.exports = app;
