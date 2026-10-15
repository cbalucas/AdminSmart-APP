const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const raiz = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);

// Permite que Metro lea los paquetes compartidos del monorepo.
config.watchFolders = [raiz];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(raiz, "node_modules"),
];

module.exports = config;
