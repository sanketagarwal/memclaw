/**
 * The dispatcher is the heart of the bus loop.
 *
 * It subscribes to inbound messages, runs the agent (scoped to the message's
 * memory thread + resource), and publishes the reply back onto the bus along
 * with run lifecycle events the monitor counts. Connectors never call the agent
 * directly — they only speak to the bus — which keeps surfaces and reasoning
 * fully decoupled.
 *
 * Approval-gated tools (e.g. workspace writes) suspend the run: `generate()`
 * returns `finishReason: 'suspended'` with no text. The dispatcher surfaces the
 * pending tool call to the user and treats their next "yes"/"no" on the same
 * thread as approve/decline; any other reply abandons the suspended run and is
 * handled as a fresh message.
 */
import type { Agent } from '@mastra/core/agent';
import type { Event, PubSub } from '@mastra/core/events';
import { TOPICS, type InboundMessage } from '../bus/topics.ts';

export interface DispatcherOptions {
  pubsub: PubSub;
  agent: Agent;
}

interface GenerateOutput {
  text?: string;
  finishReason?: string;
  runId?: string;
  suspendPayload?: { toolCallId?: string; toolName?: string; args?: unknown };
}

interface PendingApproval {
  runId: string;
  toolCallId?: string;
}

const YES = /^\s*(y|yes|approve|approved|ok|okay|go|sure|do it)\b/i;
const NO = /^\s*(n|no|nope|deny|decline|declined|cancel|stop)\b/i;

function approvalPrompt(payload: GenerateOutput['suspendPayload']): string {
  const toolName = payload?.toolName ?? 'a tool';
  const args =
    payload?.args !== undefined
      ? `\n${JSON.stringify(payload.args, null, 2).slice(0, 600)}\n`
      : ' ';
  return `⏸ Approval needed — the team wants to run "${toolName}" with:${args}Reply "yes" to approve or "no" to decline.`;
}

export async function startDispatcher({ pubsub, agent }: DispatcherOptions): Promise<void> {
  let counter = 0;
  // Suspended tool calls awaiting the user's yes/no, keyed by memory thread.
  const pendingApprovals = new Map<string, PendingApproval>();
  // Tail of each thread's run queue. Runs on the same thread execute strictly
  // in order — concurrent runs on one thread corrupt the conversation and race
  // on pendingApprovals (e.g. a multi-line paste becoming N parallel runs).
  const threadQueues = new Map<string, Promise<void>>();

  async function handleMessage(msg: InboundMessage): Promise<void> {
    const runId = `run-${msg.threadId}-${++counter}`;
    const started = Date.now();

    await pubsub.publish(TOPICS.runStarted, {
      type: 'run.started',
      runId,
      data: { source: msg.source, threadId: msg.threadId },
    });

    try {
      const pending = pendingApprovals.get(msg.threadId);
      pendingApprovals.delete(msg.threadId);
      let result: GenerateOutput;

      if (pending && (YES.test(msg.text) || NO.test(msg.text))) {
        const call = { runId: pending.runId, toolCallId: pending.toolCallId };
        result = (await (YES.test(msg.text)
          ? agent.approveToolCallGenerate(call)
          : agent.declineToolCallGenerate(call))) as GenerateOutput;
      } else {
        // Not an approval answer — if a suspension was pending, it's abandoned.
        result = (await agent.generate(msg.text, {
          memory: { thread: msg.threadId, resource: msg.resourceId },
        })) as GenerateOutput;
      }

      let text: string;
      if (result.finishReason === 'suspended' && result.runId) {
        // A tool (possibly deep in the delegation chain) needs approval.
        pendingApprovals.set(msg.threadId, {
          runId: result.runId,
          toolCallId: result.suspendPayload?.toolCallId,
        });
        text = approvalPrompt(result.suspendPayload);
      } else {
        text = result.text ?? '';
      }
      const latencyMs = Date.now() - started;

      await pubsub.publish(TOPICS.outbound, {
        type: 'message.outbound',
        runId,
        data: { text, threadId: msg.threadId, source: msg.source, replyTo: msg.replyTo, latencyMs },
      });
      await pubsub.publish(TOPICS.runCompleted, {
        type: 'run.completed',
        runId,
        data: { source: msg.source, latencyMs },
      });
    } catch (err) {
      const latencyMs = Date.now() - started;
      const text = `⚠️ ${err instanceof Error ? err.message : String(err)}`;

      await pubsub.publish(TOPICS.outbound, {
        type: 'message.outbound',
        runId,
        data: { text, threadId: msg.threadId, source: msg.source, replyTo: msg.replyTo, latencyMs },
      });
      await pubsub.publish(TOPICS.runFailed, {
        type: 'run.failed',
        runId,
        data: { source: msg.source, error: text },
      });
    }
  }

  await pubsub.subscribe(TOPICS.inbound, async (event: Event) => {
    const msg = event.data as InboundMessage;
    const tail = threadQueues.get(msg.threadId) ?? Promise.resolve();
    // handleMessage reports its own failures; keep the queue alive regardless.
    const next = tail.then(() => handleMessage(msg)).catch(() => {});
    threadQueues.set(msg.threadId, next);
    await next.finally(() => {
      // Evict once idle, or the map grows by one entry per thread ever seen.
      if (threadQueues.get(msg.threadId) === next) threadQueues.delete(msg.threadId);
    });
  });
}
