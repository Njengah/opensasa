const { spawn } = require('node:child_process');

const DEFAULT_DASHBOARD_URL = 'http://127.0.0.1:3210';

/**
 * Run the local OpenSasa CLI without invoking a shell or recording output.
 * @param {string[]} args
 * @param {{cwd?: string, executable?: string, timeoutMs?: number}} [options]
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runOpenSasaCli(args, options = {}) {
  const executable = options.executable || 'opensasa';
  const timeoutMs = options.timeoutMs || 10000;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`OpenSasa CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish(error));
    child.on('close', (exitCode) => {
      const result = { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: exitCode ?? 1 };
      if (result.exitCode !== 0) {
        finish(new Error(result.stderr || `OpenSasa CLI exited with code ${result.exitCode}`));
      } else {
        finish(null, result);
      }
    });
  });
}

/**
 * Start the local OpenSasa dashboard and resolve when its URL is known.
 * @param {string[]} args
 * @param {{cwd?: string, executable?: string, timeoutMs?: number}} [options]
 * @returns {Promise<{url: string, alreadyRunning: boolean}>}
 */
function launchOpenSasaDashboard(args, options = {}) {
  const executable = options.executable || 'opensasa';
  const timeoutMs = options.timeoutMs || 10000;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      detached: true,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`OpenSasa dashboard timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanupDetachedChild = () => {
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();
    };

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!error) {
        cleanupDetachedChild();
        resolve(result);
        return;
      }

      reject(error);
    };

    const tryResolve = () => {
      const url = parseDashboardUrl(stdout) || parseDashboardUrl(stderr);
      if (url) {
        finish(null, { url, alreadyRunning: false });
        return true;
      }

      const output = `${stdout}\n${stderr}`;
      if (isDashboardAlreadyRunning(output)) {
        finish(null, { url: DEFAULT_DASHBOARD_URL, alreadyRunning: true });
        return true;
      }

      return false;
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      tryResolve();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      tryResolve();
    });
    child.on('error', (error) => finish(error));
    child.on('close', (exitCode) => {
      if (tryResolve()) {
        return;
      }

      finish(new Error(stderr.trim() || `OpenSasa dashboard exited with code ${exitCode ?? 1}`));
    });
  });
}

function parseDashboardUrl(output) {
  const match = output.match(/OpenSasa dashboard running at (http:\/\/\S+)/);
  return match?.[1];
}

function isDashboardAlreadyRunning(output) {
  return /EADDRINUSE|address already in use/i.test(output);
}

module.exports = {
  DEFAULT_DASHBOARD_URL,
  isDashboardAlreadyRunning,
  launchOpenSasaDashboard,
  parseDashboardUrl,
  runOpenSasaCli,
};
