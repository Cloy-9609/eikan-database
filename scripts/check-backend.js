const { checkBackend } = require("./check-js");

process.exitCode = checkBackend() ? 0 : 1;
