const { validateReleaseEnvironment } = require("./release-config.cjs");
try {
  validateReleaseEnvironment(process.env);
  console.log("Mobile release environment is valid. Values are not displayed.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
