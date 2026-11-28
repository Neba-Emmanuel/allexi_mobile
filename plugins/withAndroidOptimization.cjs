const { withGradleProperties, withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidOptimization(config) {
  config = withGradleProperties(config, mod => {
    for (const key of [
      'android.enableMinifyInReleaseBuilds',
      'android.enableShrinkResourcesInReleaseBuilds',
    ]) {
      mod.modResults = mod.modResults.filter(item => item.key !== key);
      mod.modResults.push({ type: 'property', key, value: 'true' });
    }
    return mod;
  });
  return withAppBuildGradle(config, mod => {
    const contents = mod.modResults.contents;
    if (!contents.includes('proguard-android.txt') && !contents.includes('proguard-android-optimize.txt')) {
      throw new Error('Cannot locate the Android ProGuard defaults. Review the optimization plugin after upgrading Expo.');
    }
    mod.modResults.contents = contents.replaceAll('proguard-android.txt', 'proguard-android-optimize.txt');
    return mod;
  });
};
