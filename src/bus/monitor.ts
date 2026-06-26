/**
 * The bus monitor turns the event bus into something you can *see*.
 *
 * It subscribes to every memclaw topic and keeps running counters — total
 * events, per-topic breakdown, agent-run success/failure, throughput, and
 * average reply latency. Each event is also logged (so it shows up in Mastra
 * Studio's log stream), and the live stats are exposed over an HTTP route at
 * `GET /memclaw/bus`.
 */
import type { Event, PubSub } from '@mastra/core/events';
import { ALL_TOPICS, TOPICS } from './topics.ts';

export interface BusLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface BusStats {
  backend: string;
  startedAt: string;
  uptimeSec: number;
  totalEvents: number;
  eventsPerSec: number;
  perTopic: Record<string, number>;
  runs: { started: number; completed: number; failed: number };
  avgLatencyMs: number | null;
  lastEventAt: string | null;
}

export class BusMonitor {
  private startedAt = Date.now();
  private total = 0;
  private perTopic: Record<string, number> = {};
  private runs = { started: 0, completed: 0, failed: 0 };
  private latencySamples: number[] = [];
  private lastEventAt: number | null = null;
  private started = false;

  constructor(
    private readonly pubsub: PubSub,
    private readonly backend: string,
    private readonly logger?: BusLogger,
  ) {}

  /** Subscribe to all memclaw topics. Idempotent. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    for (const topic of ALL_TOPICS) {
      this.perTopic[topic] = 0;
      await this.pubsub.subscribe(topic, (event: Event) => this.record(topic, event));
    }
    this.logger?.info('[bus] monitor watching event bus', {
      backend: this.backend,
      topics: ALL_TOPICS,
    });
  }

  private record(topic: string, event: Event): void {
    this.total += 1;
    this.perTopic[topic] = (this.perTopic[topic] ?? 0) + 1;
    this.lastEventAt = Date.now();

    if (topic === TOPICS.runStarted) this.runs.started += 1;
    if (topic === TOPICS.runFailed) this.runs.failed += 1;
    if (topic === TOPICS.runCompleted) this.runs.completed += 1;

    const latency = (event.data as { latencyMs?: number } | undefined)?.latencyMs;
    if (typeof latency === 'number') {
      this.latencySamples.push(latency);
      if (this.latencySamples.length > 200) this.latencySamples.shift();
    }

    this.logger?.info(`[bus] ${topic}`, {
      type: event.type,
      runId: event.runId,
      source: (event.data as { source?: string } | undefined)?.source,
    });
  }

  getStats(): BusStats {
    const uptimeSec = (Date.now() - this.startedAt) / 1000;
    const avgLatencyMs =
      this.latencySamples.length === 0
        ? null
        : Math.round(
            this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length,
          );
    return {
      backend: this.backend,
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSec: Math.round(uptimeSec),
      totalEvents: this.total,
      eventsPerSec: uptimeSec > 0 ? Number((this.total / uptimeSec).toFixed(3)) : 0,
      perTopic: { ...this.perTopic },
      runs: { ...this.runs },
      avgLatencyMs,
      lastEventAt: this.lastEventAt ? new Date(this.lastEventAt).toISOString() : null,
    };
  }
}
