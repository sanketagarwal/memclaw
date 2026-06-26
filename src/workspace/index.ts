/**
 * Optional local workspace — Mastra's first-class way to give an agent the
 * filesystem and a shell.
 *
 * When `MEMCLAW_WORKSPACE=true`, the agent gets file tools (read/write/edit/
 * list/grep/delete) and a sandbox (`execute_command`) rooted at a directory.
 * Unlike a raw exec tool, this ships real safety: writes and commands require
 * approval, and writes require reading the file first (with stale-file
 * detection). Every call is traced in Studio.
 */
import {
  Workspace,
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
} from '@mastra/core/workspace';
import type { MemclawConfig } from '../config.ts';

export function createWorkspace(config: MemclawConfig): Workspace | undefined {
  if (!config.workspace) return undefined;

  return new Workspace({
    filesystem: new LocalFilesystem({ basePath: config.workspaceDir }),
    sandbox: new LocalSandbox({ workingDirectory: config.workspaceDir }),
    tools: {
      // Reads are free; mutating actions are gated behind approval.
      [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
        requireApproval: true,
        requireReadBeforeWrite: true,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
        requireApproval: true,
        requireReadBeforeWrite: true,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { requireApproval: true },
      [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { requireApproval: true },
    },
  });
}
