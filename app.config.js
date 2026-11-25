const { validateReleaseEnvironment } = require("./scripts/release-config.cjs");
module.exports = ({ config }) => {
  if (
    process.env.APP_ENV === "production" ||
    process.env.EAS_BUILD_PROFILE === "production"
  ) {
    validateReleaseEnvironment(process.env);
  }
  return config;
};
