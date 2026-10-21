import { spawn } from 'node:child_process';

// Each preview owns a POSIX process group; no unrelated process is signalled.
export function startPreview(command, args, options = {}) {
  if (process.platform === 'win32') throw new Error('POSIX preview cleanup required');
  const child = spawn(command, args, {
    ...options, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let closed = false, stopping;
  const closedPromise = new Promise(resolve => child.once('close', () => {
    closed = true;
    resolve(true);
  }));
  const signalGroup = signal => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const waitForClose = async milliseconds => {
    if (closed) return true;
    let timer;
    try {
      return await Promise.race([
        closedPromise,
        new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); }),
      ]);
    } finally { clearTimeout(timer); }
  };
  return {
    child,
    stop() {
      return stopping ??= (async () => {
        try {
          // The launcher may already have exited while descendants hold its pipes.
          signalGroup('SIGTERM');
          await waitForClose(1000);
          signalGroup('SIGKILL');
          if (!await waitForClose(1000)) throw new Error('Preview cleanup did not close within two seconds');
        } finally {
          child.stdout?.destroy();
          child.stderr?.destroy();
        }
      })();
    },
  };
}
