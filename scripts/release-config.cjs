function validateReleaseEnvironment(env) {
  const required = [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_PRIVACY_URL",
    "EXPO_PUBLIC_SUPPORT_URL",
  ];
  for (const key of required)
    if (!env[key]?.trim()) throw new Error(`Release requires ${key}`);
  for (const key of [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_PRIVACY_URL",
    "EXPO_PUBLIC_SUPPORT_URL",
  ]) {
    let url;
    try {
      url = new URL(env[key]);
    } catch {
      throw new Error(`${key} must be a valid HTTPS URL`);
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /localhost|127\.0\.0\.1|your-project|example\.(com|org)|192\.168\./i.test(
        url.hostname,
      )
    )
      throw new Error(`${key} must be a real public HTTPS URL`);
  }
  // const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // let role;
  // try {
  //   role = JSON.parse(
  //     Buffer.from(key.split(".")[1], "base64url").toString(),
  //   ).role;
  // } catch {}
  // if (
  //   key.startsWith("sb_secret_") ||
  //   role === "service_role" ||
  //   /fixture|your-publishable/.test(key)
  // )
  //   throw new Error(
  //     "The mobile app requires a publishable or anon key, never a server secret",
  //   );
  // for (const [name, value] of Object.entries(env)) {
  //   if (
  //     name.startsWith("EXPO_PUBLIC_") &&
  //     (/SERVICE_ROLE|SECRET|PRIVATE_KEY/.test(name) ||
  //       value?.startsWith("sb_secret_"))
  //   )
  //     throw new Error(
  //       "Server secrets cannot be included in EXPO_PUBLIC variables",
  //     );
  // }
}
module.exports = { validateReleaseEnvironment };
