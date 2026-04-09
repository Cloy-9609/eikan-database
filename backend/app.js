const express = require("express");
const cors = require("cors");
const schoolRoutes = require("./routes/schoolRoutes");
const playerRoutes = require("./routes/playerRoutes");
const errorHandler = require("./middleware/errorHandler");
const { connectDatabase } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/schools", schoolRoutes);
app.use("/api/players", playerRoutes);

app.use(errorHandler);

if (require.main === module) {
  connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;