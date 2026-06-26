/**
 * The zero-config terminal connector. Works the moment you install memclaw —
 * no platform account, no webhook, no tunnel. It speaks only to the event bus,
 * exactly like every other connector, so the terminal chat and a Telegram chat
 * exercise the identical code path.
 */
import * as readline from 'node:readline';
import os from 'node:os';
import type { Connector } from './types.ts';
import { TOPICS, type InboundMessage, type OutboundMessage } from '../bus/topics.ts';

export function createCliConnector(): Connector {
  const threadId = `cli-${Date.now()}`;
  const resourceId = `cli-${os.userInfo().username}`;
  let rl: readline.Interface | undefined;

  return {
    name: 'cli',
    async start({ pubsub }) {
      // Deliver replies addressed to this terminal session.
      await pubsub.subscribe(TOPICS.outbound, (event) => {
        const out = event.data as OutboundMessage;
        if (out.source !== 'cli' || out.threadId !== threadId) return;
        const latency = out.latencyMs ? ` \x1b[2m(${out.latencyMs}ms)\x1b[0m` : '';
        process.stdout.write(`\n\x1b[35mmemclaw\x1b[0m${latency}: ${out.text}\n\n> `);
      });

      rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      process.stdout.write(
        '\n\x1b[35m🐾 memclaw\x1b[0m — type a message, or /exit to quit.\n\n> ',
      );

      rl.on('line', async (line) => {
        const text = line.trim();
        if (!text) {
          process.stdout.write('> ');
          return;
        }
        if (text === '/exit' || text === '/quit') {
          rl?.close();
          return;
        }
        const msg: InboundMessage = {
          text,
          threadId,
          resourceId,
          source: 'cli',
          replyTo: threadId,
        };
        await pubsub.publish(TOPICS.inbound, {
          type: 'message.inbound',
          runId: threadId,
          data: msg,
        });
        process.stdout.write('\x1b[2m…thinking\x1b[0m');
      });

      rl.on('close', () => {
        process.stdout.write('\n\x1b[2mbye 👋\x1b[0m\n');
        process.exit(0);
      });
    },
    async stop() {
      rl?.close();
    },
  };
}
