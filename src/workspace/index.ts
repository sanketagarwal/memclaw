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

export interface WorkspaceOptions {
  /**
   * Gate mutating actions (writes/deletes/commands) behind human approval.
   * Default true. Set false for specialists driven THROUGH an orchestrator:
   * approvals that propagate up a supervisor delegation currently resume on a
   * regenerated sub-thread id and the tool call is rejected with
   * "Received input message with wrong threadId" (Mastra 1.15.1), so a gated
   * workspace inside a team can never complete a write.
   */
  gated?: boolean;
}

export function createWorkspace(
  config: MemclawConfig,
  { gated = true }: WorkspaceOptions = {},
): Workspace | undefined {
  if (!config.workspace) return undefined;

  // Reads are always free; writes always require reading the file first.
  const approval = gated ? { requireApproval: true } : {};
  return new Workspace({
    filesystem: new LocalFilesystem({ basePath: config.workspaceDir }),
    sandbox: new LocalSandbox({ workingDirectory: config.workspaceDir }),
    tools: {
      [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { ...approval, requireReadBeforeWrite: true },
      [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { ...approval, requireReadBeforeWrite: true },
      [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { ...approval },
      [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { ...approval },
    },
  });
}
