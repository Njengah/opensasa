const { spawn } = require('node:child_process');

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

module.exports = { runOpenSasaCli };
