import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Run a shell command on the host. This is what makes a local agent genuinely
 * useful — and genuinely dangerous. It is OFF by default (`MEMCLAW_ENABLE_SHELL`)
 * and marked `requireApproval`, so on a connected channel every command renders
 * as an Approve/Deny card before it runs.
 */
export const shellTool = createTool({
  id: 'shell',
  description:
    'Execute a shell command on the local machine and return its stdout/stderr. Use for file operations, git, scripts, and system tasks. Prefer the smallest command that does the job.',
  requireApproval: true,
  inputSchema: z.object({
    command: z.string().describe('The shell command to run'),
    cwd: z.string().optional().describe('Working directory (defaults to the process cwd)'),
    timeoutMs: z.number().int().positive().max(120_000).default(30_000),
  }),
  outputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number(),
  }),
  execute: async ({ command, cwd, timeoutMs }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      return {
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? String(err),
        exitCode: typeof e.code === 'number' ? e.code : 1,
      };
    }
  },
});
