const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, 'packages')];

// Allow require() of .lottie (dotLottie) files as static assets.
config.resolver.assetExts = [...config.resolver.assetExts, 'lottie'];

// packages/api-contract uses NodeNext-style relative imports with a `.js`
// suffix so the server runtime (tsx + compiled output) resolves them.
// Metro doesn't strip `.js` to find `.ts` sources by default, so teach it to.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // fall through to default resolution below
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
