const fs = require("fs");
const path = require("path");

const HOT_RELOAD_ENABLED = process.env.HOT_RELOAD === "1";
const RELOAD_DEBOUNCE_MS = 120;

const HOT_RELOAD_CLIENT_SNIPPET = String.raw`
<script>
(() => {
  if (window.__EIKAN_HOT_RELOAD__) {
    return;
  }

  window.__EIKAN_HOT_RELOAD__ = true;

  let reloading = false;
  let waitingForServer = false;

  const reloadPage = () => {
    if (reloading) {
      return;
    }

    reloading = true;
    window.location.reload();
  };

  const pollUntilServerReturns = async () => {
    if (waitingForServer) {
      return;
    }

    waitingForServer = true;

    while (!reloading) {
      try {
        const response = await fetch("/__dev/health?ts=" + Date.now(), {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (response.ok || response.status === 204) {
          reloadPage();
          return;
        }
      } catch (error) {
        // Wait for the dev server to finish restarting.
      }

      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
  };

  const eventSource = new EventSource("/__dev/events");

  eventSource.addEventListener("reload", reloadPage);
  eventSource.onerror = () => {
    eventSource.close();
    void pollUntilServerReturns();
  };

  window.addEventListener(
    "beforeunload",
    () => {
      eventSource.close();
    },
    { once: true }
  );
})();
</script>
`;

function isHotReloadEnabled() {
  return HOT_RELOAD_ENABLED;
}

function isPathInsideRoot(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function resolveHtmlPath(frontendPath, requestPath) {
  if (requestPath === "/") {
    return path.join(frontendPath, "pages", "index.html");
  }

  if (!requestPath.endsWith(".html")) {
    return null;
  }

  const sanitizedPath = requestPath.replace(/^\/+/, "");
  const targetPath = path.resolve(frontendPath, sanitizedPath);
  return isPathInsideRoot(frontendPath, targetPath) ? targetPath : null;
}

function injectHotReloadClient(html) {
  if (html.includes("/__dev/events")) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${HOT_RELOAD_CLIENT_SNIPPET}\n</body>`);
  }

  if (html.includes("</html>")) {
    return html.replace("</html>", `${HOT_RELOAD_CLIENT_SNIPPET}\n</html>`);
  }

  return `${html}\n${HOT_RELOAD_CLIENT_SNIPPET}`;
}

function createHtmlMiddleware(frontendPath) {
  const frontendRoot = path.resolve(frontendPath);

  return async function frontendHtmlMiddleware(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const filePath = resolveHtmlPath(frontendRoot, req.path);
    if (!filePath) {
      return next();
    }

    try {
      if (!isHotReloadEnabled()) {
        return res.sendFile(filePath);
      }

      const html = await fs.promises.readFile(filePath, "utf8");
      res.type("html");
      return res.send(injectHotReloadClient(html));
    } catch (error) {
      if (error.code === "ENOENT") {
        return next();
      }

      return next(error);
    }
  };
}

function createReloadController() {
  const clients = new Set();
  let reloadTimer = null;

  function broadcast(eventName, payload) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      client.write(message);
    }
  }

  function addClient(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders?.();
    res.write("retry: 500\n\n");
    clients.add(res);

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      res.end();
    });
  }

  function scheduleReload(filePath = "") {
    clearTimeout(reloadTimer);

    reloadTimer = setTimeout(() => {
      broadcast("reload", {
        filePath,
        updatedAt: Date.now(),
      });
    }, RELOAD_DEBOUNCE_MS);
  }

  function close() {
    clearTimeout(reloadTimer);

    for (const client of clients) {
      client.end();
    }

    clients.clear();
  }

  return {
    addClient,
    close,
    scheduleReload,
  };
}

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

function createDirectoryWatchers(targetPath, onChange) {
  try {
    return [
      fs.watch(targetPath, { recursive: true }, (eventType, fileName) => {
        onChange(eventType, fileName);
      }),
    ];
  } catch (error) {
    if (error.code !== "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") {
      throw error;
    }
  }

  return collectDirectories(targetPath).map((directoryPath) =>
    fs.watch(directoryPath, (eventType, fileName) => {
      onChange(eventType, fileName);
    })
  );
}

function registerHotReload(app, { frontendPath }) {
  if (!isHotReloadEnabled()) {
    return () => {};
  }

  const frontendRoot = path.resolve(frontendPath);
  const reloadController = createReloadController();

  app.get("/__dev/health", (_req, res) => {
    res.status(204).end();
  });

  app.get("/__dev/events", (req, res) => {
    reloadController.addClient(req, res);
  });

  const watchers = createDirectoryWatchers(frontendRoot, (_eventType, fileName) => {
    const changedFile = typeof fileName === "string" ? fileName : "";
    reloadController.scheduleReload(changedFile);
  });

  console.log("Hot reload enabled for frontend files.");

  return () => {
    reloadController.close();
    watchers.forEach((watcher) => watcher.close());
  };
}

module.exports = {
  createHtmlMiddleware,
  isHotReloadEnabled,
  registerHotReload,
};
