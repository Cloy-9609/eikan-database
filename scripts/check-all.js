const { checkBackend, checkFrontend } = require("./check-js");

const backendOk = checkBackend();
const frontendOk = checkFrontend();

process.exitCode = backendOk && frontendOk ? 0 : 1;
