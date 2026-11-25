const { validateReleaseEnvironment } = require("./release-config.cjs");
function validateBuild(env) {
  if (env.APP_ENV === "production" || env.EAS_BUILD_PROFILE === "production") {
    validateReleaseEnvironment(env);
  }
}
if (require.main === module) {
  try {
    // Follow Expo's production dotenv precedence without overriding shell/EAS values.
    if (
      process.env.APP_ENV === "production" ||
      process.env.EAS_BUILD_PROFILE === "production"
    ) {
      const fs = require("node:fs");
      for (const file of [
        ".env.production.local",
        ".env.local",
        ".env.production",
        ".env",
      ]) {
        if (fs.existsSync(file)) process.loadEnvFile(file);
      }
    }
    validateBuild(process.env);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { validateBuild };
