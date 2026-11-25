const { withPodfile } = require('expo/config-plugins');

const marker = '# Allexi: align resource bundles with the app deployment target';

function alignPodTargets(contents) {
  if (contents.includes(marker)) return contents;
  const endOfPostInstall = /\n  end\nend\s*$/;
  if (!contents.includes('post_install do |installer|') || !endOfPostInstall.test(contents)) {
    throw new Error('Unable to locate the Expo Podfile post_install hook. Review the deployment-target plugin after upgrading Expo.');
  }
  return contents.replace(endOfPostInstall, `
    ${marker}
    minimum_target = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |build_config|
        current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '0'
        if Gem::Version.correct?(current_target) && Gem::Version.new(current_target) < minimum_target
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_target.to_s
        end
      end
    end
  end
end
`);
}

module.exports = function withPodDeploymentTargets(config) {
  return withPodfile(config, config => {
    config.modResults.contents = alignPodTargets(config.modResults.contents);
    return config;
  });
};
module.exports.alignPodTargets = alignPodTargets;
