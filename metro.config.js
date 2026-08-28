const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// `landing/` is a separate Next.js project living in this repo. Nothing in the
// app imports from it, but Metro crawls the whole project root, so without this
// it watches landing/node_modules - a second copy of react and react-dom that
// only slows the dev server and the web export down.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
    ...(Array.isArray(existingBlockList)
        ? existingBlockList
        : existingBlockList
          ? [existingBlockList]
          : []),
    /[\\/]landing[\\/].*/,
];

module.exports = withNativewind(config);
