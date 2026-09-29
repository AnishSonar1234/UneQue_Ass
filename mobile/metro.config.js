const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Only watch the mobile folder — prevents Metro from trying to watch
// the root node_modules (which may not exist) via the workspaces field
// in the root package.json.
config.watchFolders = [projectRoot];

// Tell Metro where to look for node_modules — include BOTH the mobile's
// node_modules AND the root node_modules (where @babel/runtime lives
// when npm hoists it from workspace installs).
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(monoRoot, "node_modules"),
];

module.exports = config;
