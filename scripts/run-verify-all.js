const { spawn } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const commands = [
  ["npm", ["run", "check:all"]],
  ["npm", ["run", "test:core"]],
  ["npm", ["run", "db:check:test"]],
  ["npm", ["run", "diff:check"]],
];

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("close", (code, signal) => {
      if (signal) {
        console.error(`${command} ${args.join(" ")} terminated by signal: ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  for (const [command, args] of commands) {
    const exitCode = await runCommand(command, args);

    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
