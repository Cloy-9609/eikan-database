const express = require("express");
const path = require("path");
const schoolRoutes = require("./routes/schoolRoutes");
const playerRoutes = require("./routes/playerRoutes");
const errorHandler = require("./middleware/errorHandler");
const { connectDatabase } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.json());

app.use("/api/schools", schoolRoutes);
app.use("/api/players", playerRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "pages", "index.html"));
});

app.use(express.static(frontendPath));

app.use(errorHandler);

if (require.main === module) {
  connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
