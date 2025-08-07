const path = require('path');

module.exports = {
  generateInstaller: async function(options) {
    // Set the installation directory to $LOCALAPPDATA\Programs\xdlwebcast
    options.defaultInstallationDirectory = path.join(process.env.LOCALAPPDATA, 'Programs', 'xdlwebcast');
    return options;
  }
};
