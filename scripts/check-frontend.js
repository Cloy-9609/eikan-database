const { checkFrontend } = require("./check-js");

process.exitCode = checkFrontend() ? 0 : 1;
