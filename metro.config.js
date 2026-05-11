const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, 'packages')];

// Allow require() of .lottie (dotLottie) files as static assets.
config.resolver.assetExts = [...config.resolver.assetExts, 'lottie'];

module.exports = config;
