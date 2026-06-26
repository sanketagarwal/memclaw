/**
 * memclaw's own event topics, layered on top of Mastra's pub/sub bus.
 *
 * Every user-facing message flows through these topics, which makes the whole
 * system observable and replayable: connectors publish inbound messages, the
 * dispatcher publishes the agent's replies, and the bus monitor meters it all.
 *
 * Mastra's built-in systems (workflows, agent streams, background tasks) publish
 * onto the SAME bus under their own topic families — see the README for the full
 * map — so the backend you pick in `.env` applies to memclaw and Mastra alike.
 */

export const TOPICS = {
  /** A connector received a message from a user. */
  inbound: 'memclaw.message.inbound',
  /** The agent produced a reply, addressed back to a connector. */
  outbound: 'memclaw.message.outbound',
  /** Lifecycle signal: an agent run started. */
  runStarted: 'memclaw.agent.run.started',
  /** Lifecycle signal: an agent run finished (success). */
  runCompleted: 'memclaw.agent.run.completed',
  /** Lifecycle signal: an agent run threw. */
  runFailed: 'memclaw.agent.run.failed',
} as const;

/** All memclaw topics, handy for the bus monitor to subscribe in a loop. */
export const ALL_TOPICS = Object.values(TOPICS);

/** An inbound user message published by a connector. */
export interface InboundMessage {
  /** Raw user text. */
  text: string;
  /** Conversation/thread id — scopes memory. */
  threadId: string;
  /** Stable user/resource id — scopes long-term memory across threads. */
  resourceId: string;
  /** Which connector this came from, e.g. "cli" or "telegram". */
  source: string;
  /** Opaque address the connector uses to route the reply back. */
  replyTo?: string;
}

/** An outbound reply published by the dispatcher for a connector to deliver. */
export interface OutboundMessage {
  text: string;
  threadId: string;
  source: string;
  replyTo?: string;
  /** Wall-clock latency of the agent run, in milliseconds. */
  latencyMs?: number;
}
