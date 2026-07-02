/**
 * The `memclaw` command-line interface.
 *
 * `.env` is loaded first (via Node's built-in loader), then everything else is
 * imported dynamically — config and the Mastra instance read `process.env` at
 * import time, so the environment has to be in place before they load.
 */

// Load .env before importing any module that reads process.env.
try {
  process.loadEnvFile();
} catch {
  // No .env yet — `memclaw setup` / `doctor` will guide the user.
}

const RESET = '\x1b[0m';
const PINK = '\x1b[35m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

function hasOpenAIKey(): boolean {
  const k = process.env.OPENAI_API_KEY;
  return !!k && k !== 'your-openai-api-key' && k !== 'your-api-key';
}

function requireKeyOrExit(): void {
  if (hasOpenAIKey()) return;
  console.error(
    `${RED}✗ No model API key found.${RESET}\n` +
      `Set OPENAI_API_KEY in your .env file, or run ${PINK}npm run setup${RESET}.`,
  );
  process.exit(1);
}

async function runChat(): Promise<void> {
  requireKeyOrExit();
  const { startRuntime } = await import('./runtime/start.ts');
  const { createCliConnector } = await import('./connectors/cli.ts');
  await startRuntime([createCliConnector()]);
}

async function runStart(): Promise<void> {
  requireKeyOrExit();
  const { buildChannels } = await import('./connectors/channels.ts');
  const { enabled } = buildChannels();
  console.log(`${PINK}🐾 memclaw runtime${RESET}`);
  console.log(`${DIM}bus: ${process.env.MEMCLAW_PUBSUB ?? 'memory'}  •  channels: ${
    enabled.length ? enabled.join(', ') : 'none (terminal only)'
  }${RESET}`);
  if (enabled.length) {
    console.log(
      `${DIM}note: platform channels are served by the Mastra server — run ${RESET}${PINK}npm run dev${RESET}${DIM} for those.${RESET}`,
    );
  }
  const { startRuntime } = await import('./runtime/start.ts');
  const { createCliConnector } = await import('./connectors/cli.ts');
  await startRuntime([createCliConnector()]);
}

async function runDoctor(): Promise<void> {
  const { config } = await import('./config.ts');
  const { buildChannels } = await import('./connectors/channels.ts');

  const ok = (label: string, value = '') =>
    console.log(`  ${GREEN}✓${RESET} ${label}${value ? ` ${DIM}${value}${RESET}` : ''}`);
  const warn = (label: string) => console.log(`  ${YELLOW}!${RESET} ${label}`);
  const bad = (label: string) => console.log(`  ${RED}✗${RESET} ${label}`);

  console.log(`\n${PINK}memclaw doctor${RESET}\n`);

  hasOpenAIKey() ? ok('OPENAI_API_KEY set') : bad('OPENAI_API_KEY missing — run `npm run setup`');
  ok('agent model', config.model);
  ok('memory model', config.memoryModel);
  ok('pub/sub backend', config.pubsub);

  if (config.browser) {
    let installed = false;
    try {
      await import('playwright-core');
      installed = true;
    } catch {
      /* not installed */
    }
    installed
      ? ok('browser', 'enabled')
      : warn('browser enabled but Playwright not found — run `npx playwright install chromium`');
  } else {
    console.log(`  ${DIM}· browser disabled (MEMCLAW_BROWSER=false)${RESET}`);
  }

  config.workspace
    ? ok('workspace', `${config.workspaceDir} (fs + sandbox, approval-gated)`)
    : console.log(`  ${DIM}· workspace disabled (MEMCLAW_WORKSPACE=false)${RESET}`);

  if (config.schedule) {
    warn(`scheduler ENABLED — cron "${config.scheduleCron}" ${config.scheduleTimezone ?? '(host tz)'}`);
    console.log(
      `    ${DIM}delivery: ${config.scheduleDeliverTo ?? 'bus-only (set MEMCLAW_SCHEDULE_DELIVER_TO)'}${RESET}`,
    );
  } else {
    console.log(`  ${DIM}· scheduler disabled (MEMCLAW_SCHEDULE=false)${RESET}`);
  }

  config.webhooks
    ? ok('webhooks', 'inbound signals ON (POST /webhooks/:source)')
    : console.log(`  ${DIM}· webhooks disabled (MEMCLAW_WEBHOOKS=false)${RESET}`);

  config.team
    ? ok('multi-agent', 'research-team orchestrator registered')
    : console.log(`  ${DIM}· multi-agent team disabled (MEMCLAW_TEAM=false)${RESET}`);

  const { enabled } = buildChannels();
  enabled.length
    ? ok('channels', enabled.join(', '))
    : console.log(`  ${DIM}· no platform channels configured${RESET}`);

  const { loadCapabilities } = await import('./capabilities/index.ts');
  const bundle = await loadCapabilities(config);
  ok('capabilities', `${bundle.active.length} active (${bundle.active.map((c) => c.id).join(', ')})`);

  console.log('');
  // MCP servers keep child connections open; force-exit this one-shot command.
  process.exit(0);
}

async function runCapabilities(): Promise<void> {
  const { config } = await import('./config.ts');
  const { loadCapabilities } = await import('./capabilities/index.ts');
  const bundle = await loadCapabilities(config);

  console.log(`\n${PINK}🐾 memclaw capabilities${RESET}\n`);

  for (const { capability: cap, tools, agents, workflows } of bundle.resolved) {
    console.log(
      `  ${GREEN}●${RESET} ${cap.name} ${DIM}(${cap.id}) v${cap.version ?? '0.0.0'}${RESET}`,
    );
    console.log(`    ${DIM}${cap.description}${RESET}`);
    if (tools.length) console.log(`    ${DIM}tools:${RESET} ${tools.join(', ')}`);
    if (agents.length) console.log(`    ${DIM}agents:${RESET} ${agents.join(', ')}`);
    if (workflows.length) console.log(`    ${DIM}workflows:${RESET} ${workflows.join(', ')}`);
    for (const e of cap.env ?? []) {
      const set = !!process.env[e.name];
      const mark = set ? `${GREEN}✓${RESET}` : e.required ? `${RED}✗${RESET}` : `${YELLOW}·${RESET}`;
      console.log(`    ${mark} ${e.name} ${DIM}— ${e.description}${RESET}`);
    }
  }

  for (const s of bundle.skipped) {
    console.log(
      `  ${DIM}○ ${s.capability.name} (${s.capability.id}) — ${s.reason}${RESET}`,
    );
  }
  console.log('');
  // MCP servers keep child connections open; force-exit this one-shot command.
  process.exit(0);
}

async function runBus(): Promise<void> {
  const url = 'http://localhost:4111/memclaw/bus';
  try {
    const res = await fetch(url);
    const stats = await res.json();
    console.log(JSON.stringify(stats, null, 2));
  } catch {
    console.error(
      `${RED}✗ Could not reach ${url}${RESET}\n` +
        `Start the server first with ${PINK}npm run dev${RESET}.`,
    );
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
${PINK}🐾 memclaw${RESET} — a local-first personal AI agent on the Mastra stack

${DIM}Usage:${RESET} memclaw <command>   (or: npm run <command>)

  ${GREEN}setup${RESET}     Interactive first-time setup (writes .env)
  ${GREEN}chat${RESET}      Talk to memclaw in your terminal (zero config)
  ${GREEN}start${RESET}     Run the bus runtime (dispatcher + connectors + monitor)
  ${GREEN}dev${RESET}       Launch Mastra Studio — traces, memory, screencast, channels
  ${GREEN}caps${RESET}      List active capabilities (tools, agents, workflows)
  ${GREEN}doctor${RESET}    Check your configuration
  ${GREEN}bus${RESET}       Print live event-bus metrics (needs the server running)
  ${GREEN}version${RESET}   Print the version
`);
}

const command = process.argv[2] ?? 'help';

switch (command) {
  case 'chat':
    await runChat();
    break;
  case 'start':
    await runStart();
    break;
  case 'caps':
  case 'capabilities':
    await runCapabilities();
    break;
  case 'doctor':
    await runDoctor();
    break;
  case 'bus':
    await runBus();
    break;
  case 'version':
  case '--version':
  case '-v':
    console.log('memclaw 0.1.0');
    break;
  default:
    printHelp();
}
