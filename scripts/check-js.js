const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

const backendFiles = [
  "backend/app.js",
  "backend/constants/playerRelations.js",
  "backend/constants/playerSnapshots.js",
  "backend/constants/prefectures.js",
  "backend/controllers/playerController.js",
  "backend/controllers/schoolController.js",
  "backend/db/database.js",
  "backend/db/managementCodeMigration.js",
  "backend/db/schoolProgressionMigration.js",
  "backend/dev/hotReload.js",
  "backend/helpers/managementCodes.js",
  "backend/middleware/errorHandler.js",
  "backend/models/playerModel.js",
  "backend/models/playerSeriesModel.js",
  "backend/models/schoolModel.js",
  "backend/models/schoolYearProgressLogModel.js",
  "backend/routes/playerRoutes.js",
  "backend/routes/playerSeriesRoutes.js",
  "backend/routes/schoolRoutes.js",
  "backend/services/playerService.js",
  "backend/services/schoolService.js",
  "scripts/check-all.js",
  "scripts/check-backend.js",
  "scripts/check-frontend.js",
  "scripts/check-js.js",
  "scripts/dev-server.js",
  "scripts/init_db.js",
  "scripts/migrate.js",
  "scripts/setup_db.js",
];

const frontendFiles = [
  "frontend/js/api/playerApi.js",
  "frontend/js/api/schoolApi.js",
  "frontend/js/components/admissionYearPicker.js",
  "frontend/js/components/modal.js",
  "frontend/js/components/tabs.js",
  "frontend/js/constants/prefectures.js",
  "frontend/js/pages/player_detail.js",
  "frontend/js/pages/player_edit.js",
  "frontend/js/pages/player_register.js",
  "frontend/js/pages/players.js",
  "frontend/js/pages/school_detail.js",
  "frontend/js/pages/schools.js",
  "frontend/js/state/playerSearchState.mjs",
  "frontend/js/state/schoolSearchState.mjs",
  "frontend/js/utils/formatter.js",
  "frontend/js/utils/playerRelations.js",
  "frontend/js/utils/playerSnapshots.js",
  "frontend/js/utils/validator.js",
];

function existingFiles(files) {
  return files.filter((relativePath) => fs.existsSync(path.join(projectRoot, relativePath)));
}

function printResult(result) {
  if (result.error) {
    console.error(result.error.message);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function checkBackendFile(relativePath) {
  const result = spawnSync(process.execPath, ["--check", relativePath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  printResult(result);

  return result.status === 0;
}

function checkFrontendFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    cwd: projectRoot,
    encoding: "utf8",
    input: source,
  });

  printResult(result);

  return result.status === 0;
}

function runChecks(label, files, checkFile) {
  const targets = existingFiles(files);
  let failed = false;

  console.log(`Checking ${label} JavaScript syntax (${targets.length} files)...`);

  for (const relativePath of targets) {
    const ok = checkFile(relativePath);
    const marker = ok ? "ok" : "failed";
    console.log(`[${marker}] ${relativePath}`);

    if (!ok) {
      failed = true;
    }
  }

  return !failed;
}

function checkBackend() {
  return runChecks("backend/CommonJS", backendFiles, checkBackendFile);
}

function checkFrontend() {
  return runChecks("frontend/ES module", frontendFiles, checkFrontendFile);
}

module.exports = {
  checkBackend,
  checkFrontend,
};
