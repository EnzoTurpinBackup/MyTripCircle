// Configuration Metro : sur web, react-native-maps n'a pas d'implémentation
// (il importe des modules natifs). On le résout vers un module vide pour ne
// pas casser le bundle web ; les écrans affichent un fallback quand la carte
// n'est pas disponible.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const isReactNativeMaps = (moduleName) =>
  moduleName === "react-native-maps" || moduleName.startsWith("react-native-maps/");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && isReactNativeMaps(moduleName)) {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
