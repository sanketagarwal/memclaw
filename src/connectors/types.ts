/**
 * A Connector bridges the outside world to memclaw's event bus.
 *
 * On `start`, a connector typically:
 *   1. subscribes to TOPICS.outbound to deliver the agent's replies, and
 *   2. publishes user input to TOPICS.inbound.
 *
 * This is the seam for adding your own surfaces (a web socket, an email inbox, a
 * hardware button) without touching the agent or the bus. See docs/connectors.md.
 */
import type { PubSub } from '@mastra/core/events';

export interface ConnectorContext {
  pubsub: PubSub;
}

export interface Connector {
  /** Stable identifier, also used as the `source` on bus messages. */
  name: string;
  start(ctx: ConnectorContext): Promise<void>;
  stop?(): Promise<void>;
}
