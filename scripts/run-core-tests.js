const { spawn } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const testRoot = path.join(repoRoot, "tests/core");

function collectTestFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const testFiles = collectTestFiles(testRoot).sort((left, right) => left.localeCompare(right));

  if (testFiles.length === 0) {
    console.error("No core test files found.");
    process.exitCode = 1;
    return;
  }

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "eikan-core-runner-"));
  const guardDatabasePath = path.join(tempRoot, "guard.sqlite");

  try {
    const child = spawn(
      process.execPath,
      ["--test", "--test-concurrency=1", ...testFiles],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          EIKAN_CORE_TEST_TEMP_ROOT: tempRoot,
          EIKAN_DB_PATH: guardDatabasePath,
        },
        shell: false,
        stdio: "inherit",
      }
    );

    const exitCode = await new Promise((resolve) => {
      child.on("close", (code, signal) => {
        if (signal) {
          console.error(`Core test runner terminated by signal: ${signal}`);
          resolve(1);
          return;
        }

        resolve(code ?? 1);
      });
    });

    process.exitCode = exitCode;
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
