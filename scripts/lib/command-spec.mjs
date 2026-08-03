/**
 * Resolve a process command without relying on a visible shell window.
 *
 * Windows cannot execute npm.cmd with shell:false through Node's spawn APIs.
 * Use the platform command processor explicitly, hidden by safe-spawn, while
 * keeping every argument as a separate token. Other commands stay shell-free.
 */
export function resolveCommandSpec(command, args = [], platform = process.platform) {
  const argv = Array.isArray(args) ? args.map(String) : [];
  if (platform === 'win32' && command === 'npm') {
    return { executable: 'cmd.exe', args: ['/d', '/s', '/c', 'npm', ...argv], transport: 'windows-command-shim' };
  }
  return { executable: command, args: argv, transport: 'direct' };
}

export function classifySpawnResult(result = {}) {
  const status = Number.isInteger(result.status) ? result.status : null;
  const signal = result.signal || null;
  const code = result.error?.code || null;
  const message = result.error?.message || null;
  return {
    ok: status === 0 && !result.error,
    status,
    signal,
    spawnError: code ? { code, message } : null,
    detail: code
      ? `spawn error ${code}${message ? `: ${message}` : ''}`
      : signal
        ? `terminated by signal ${signal}`
        : `exit code ${status ?? 'unknown'}`,
  };
}

