import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { runGrowthRadar } from './growth-radar.mjs';
import { writeIndexingQueue } from './indexing-queue.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function runNode(args, env = {}, timeoutMs = 120000) {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(t);
      resolveP({ code, stdout, stderr });
    });
  });
}

function sh(cmd, args, timeoutMs = 120000) {
  return new Promise((resolveP) => {
    const child = spawn(cmd, args, { cwd: process.cwd(), shell: false, env: process.env });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(t);
      resolveP({ code, stdout, stderr });
    });
  });
}

/**
 * Growth closer — turn radar opportunities into live FAQ + meta bridges (SSH → prod DB).
 */
export async function runGrowthCloser(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const wantApply = opts.apply !== false;

  let radar = opts.radar;
  if (!radar?.data?.opportunities) {
    radar = await runGrowthRadar(profile, { outDir });
  }
  const ops = radar.data?.opportunities || [];

  const HOST = process.env.MERIDIAN_PROD_SSH || 'deploy@200.234.45.106';
  const APP = process.env.MERIDIAN_PROD_APP || '/var/www/zigma-technologies';
  const LOCAL = resolve(process.cwd(), 'scripts/_remote-growth-closer.mjs');
  const REMOTE = '/tmp/meridian-growth-closer.mjs';

  let remote = { ok: true, status: 'noop', message: 'No opportunities', closed: 0, results: [] };

  if (ops.length && opts.skipRemote !== true) {
    const ping = await sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, 'echo ok'], 30000);
    if (ping.code !== 0) {
      // Local DB fallback (dev / same DB)
      const localArgs = ['scripts/_remote-growth-closer.mjs'];
      if (wantApply) localArgs.push('--apply');
      const r = await runNode(localArgs, {
        MERIDIAN_GROWTH_OPS_JSON: JSON.stringify(ops),
      });
      try {
        remote = JSON.parse(r.stdout.trim());
      } catch {
        remote = {
          ok: false,
          status: 'ssh_unavailable',
          message: (ping.stderr || 'SSH unavailable; local apply also failed').trim().slice(0, 300),
        };
      }
    } else {
      const opsPath = resolve(outDir, 'growth-ops-payload.json');
      await writeFile(opsPath, JSON.stringify(ops), 'utf8');
      const scpScript = await sh('scp', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', LOCAL, `${HOST}:${REMOTE}`], 60000);
      const scpOps = await sh(
        'scp',
        ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', opsPath, `${HOST}:/tmp/meridian-growth-ops.json`],
        60000
      );
      if (scpScript.code !== 0 || scpOps.code !== 0) {
        remote = {
          ok: false,
          status: 'scp_failed',
          message: ((scpScript.stderr || '') + (scpOps.stderr || '')).trim().slice(0, 300),
        };
      } else {
        const applyFlag = wantApply ? '--apply' : '';
        const cmd = `cd ${APP} && NODE_PATH=./node_modules node ${REMOTE} --ops /tmp/meridian-growth-ops.json ${applyFlag}`;
        const run = await sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, cmd], 120000);
        try {
          remote = JSON.parse((run.stdout || '').trim());
        } catch {
          remote = {
            ok: run.code === 0,
            status: 'error',
            message: (run.stderr || run.stdout || 'remote closer failed').trim().slice(0, 500),
          };
        }
      }
    }
  }

  // Indexing queue for home + FAQ URLs
  const paths = ['/', '/contact', '/blog'];
  for (const r of remote.results || []) {
    if (r.href) paths.push(r.href);
  }
  let indexQ = { ok: true, message: 'indexing skipped' };
  if (opts.skipIndex !== true) {
    indexQ = await writeIndexingQueue(profile, { outDir, paths: [...new Set(paths)], limit: 8 });
  }

  const closedCount = Number(remote.closed || 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '25',
    origin: String(profile.origin || '').replace(/\/$/, ''),
    opportunityCount: ops.length,
    closedCount,
    remote,
    indexing: { message: indexQ.message },
    boardLine:
      ops.length === 0
        ? 'Growth closer — radar clear; no opportunities this cycle.'
        : closedCount > 0 || remote.status === 'closed'
          ? `Growth closer — ${closedCount || remote.results?.length || 0} opportunity(ies) bridged (FAQ + home proof).`
          : `Growth closer — ${ops.length} opportunity(ies) staged · ${remote.message || remote.status}`,
  };

  await writeFile(resolve(outDir, 'growth-closer.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'growth-closer.md'),
    [
      `# Growth closer — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      payload.boardLine,
      '',
      '| Query | Kind | Blog | Home | Status |',
      '| --- | --- | --- | --- | --- |',
      ...(remote.results || []).map(
        (r) =>
          `| ${r.query} | ${r.kind} | ${r.blog?.action || '—'} | ${r.home?.action || '—'} | ${r.status} |`
      ),
      '',
      indexQ.message,
      '',
    ].join('\n'),
    'utf8'
  );

  return {
    ok: remote.ok !== false,
    status: ops.length === 0 ? 'clear' : closedCount > 0 || remote.status === 'closed' ? 'closed' : remote.status || 'pending',
    message: payload.boardLine,
    data: {
      ...payload,
      paths: {
        json: resolve(outDir, 'growth-closer.json'),
        md: resolve(outDir, 'growth-closer.md'),
      },
    },
  };
}
