const EXTENSION_NAMESPACE = 'opensasa';
const DB_PATH_SETTING = 'dbPath';

function readConfiguredDbPath(config) {
  const value = config.get(DB_PATH_SETTING);
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getExtensionDbPath(workspace) {
  return readConfiguredDbPath(workspace.getConfiguration(EXTENSION_NAMESPACE));
}

function appendDbPathArgs(args, dbPath) {
  return dbPath ? [...args, '--db-path', dbPath] : args;
}

module.exports = {
  appendDbPathArgs,
  DB_PATH_SETTING,
  EXTENSION_NAMESPACE,
  getExtensionDbPath,
  readConfiguredDbPath,
};
