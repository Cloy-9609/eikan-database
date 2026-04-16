process.env.HOT_RELOAD = "1";

const fs = require("fs");
const path = require("path");

const BACKEND_ROOT = path.resolve(__dirname, "..", "backend");
const RESTART_DEBOUNCE_MS = 120;

let activeServer = null;
let activeCleanup = () => {};
let restartTimer = null;
let restartChain = Promise.resolve();
let shuttingDown = false;

function collectDirectories(rootPath) {
  const directories = [rootPath];
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      directories.push(...collectDirectories(path.join(rootPath, entry.name)));
    }
  }

  return directories;
}

function createWatchers(targetPath, onChange) {
  try {
    return [
      fs.watch(targetPath, { recursive: true }, (_eventType, fileName) => {
        onChange(fileName);
      }),
    ];
  } catch (error) {
    if (error.code !== "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") {
      throw error;
    }
  }

  return collectDirectories(targetPath).map((directoryPath) =>
    fs.watch(directoryPath, (_eventType, fileName) => {
      onChange(fileName);
    })
  );
}

function clearBackendRequireCache() {
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.startsWith(BACKEND_ROOT)) {
      delete require.cache[cacheKey];
    }
  }
}

async function stopActiveServer() {
  activeCleanup();
  activeCleanup = () => {};

  if (!activeServer) {
    return;
  }

  await new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  activeServer = null;
}

async function startActiveServer() {
  clearBackendRequireCache();

  const backendApp = require("../backend/app");
  activeCleanup =
    typeof backendApp.cleanupHotReload === "function" ? backendApp.cleanupHotReload : () => {};
  activeServer = await backendApp.startServer();
}

async function restartServer(changedFile = "") {
  const changedLabel = typeof changedFile === "string" && changedFile ? changedFile : "backend file";
  console.log(`Detected change in ${changedLabel}. Restarting dev server...`);

  try {
    await stopActiveServer();
    await startActiveServer();
  } catch (error) {
    console.error("Failed to restart dev server:", error);
  }
}

function scheduleRestart(changedFile = "") {
  if (shuttingDown) {
    return;
  }

  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartChain = restartChain.then(() => restartServer(changedFile));
  }, RESTART_DEBOUNCE_MS);
}

const backendWatchers = createWatchers(BACKEND_ROOT, (fileName) => {
  scheduleRestart(typeof fileName === "string" ? fileName : "");
});

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearTimeout(restartTimer);
  backendWatchers.forEach((watcher) => watcher.close());

  console.log(`Stopping dev server (${signal})...`);

  try {
    await stopActiveServer();
    process.exit(0);
  } catch (error) {
    console.error("Failed to stop dev server cleanly:", error);
    process.exit(1);
  }
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});

startActiveServer().catch((error) => {
  console.error("Failed to start dev server:", error);
});
