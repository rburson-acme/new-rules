const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const extraNodeModules = new Proxy(
  {
    thredlib: path.resolve(__dirname, '../thredlib'),
  },
  {
    get: (target, name) => {
      if (target.hasOwnProperty(name)) {
        return target[name];
      }
      return path.join(process.cwd(), `node_modules/${name}`);
    },
  },
);

const watchFolders = [path.resolve(__dirname, '../thredlib')];

const config = {
  projectRoot: path.resolve(__dirname),
  /*transformer: {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },*/
  resolver: {
    extraNodeModules,
  },
  watchFolders,
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
