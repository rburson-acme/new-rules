const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const thredlibRoot = path.resolve(__dirname, '../thredlib');

const config = getDefaultConfig(__dirname);

// Watch thredlib source so Metro picks up changes without a separate build step
config.watchFolders = [thredlibRoot];

// Map 'thredlib' imports directly to its TypeScript source
config.resolver.extraNodeModules = {
  thredlib: path.join(thredlibRoot, 'src'),
};

// thredlib source uses NodeNext-style .js extensions in imports (e.g. './core/Foo.js')
// which refer to .ts source files. Metro doesn't remap these automatically, so we do it here.
// Scoped to thredlib only to avoid interfering with other packages.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromThredlib = context.originModulePath.startsWith(thredlibRoot);
  if (fromThredlib && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3) + '.ts', platform);
    } catch {}
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3) + '.tsx', platform);
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
