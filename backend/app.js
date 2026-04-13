const express = require("express");
const path = require("path");
const schoolRoutes = require("./routes/schoolRoutes");
const playerRoutes = require("./routes/playerRoutes");
const errorHandler = require("./middleware/errorHandler");
const { initializeDatabase, databasePath } = require("./db/database");

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

async function startServer(port = PORT) {
  console.log(`Using SQLite database at ${databasePath}`);
  await initializeDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      console.log(`Server running on port ${actualPort}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
