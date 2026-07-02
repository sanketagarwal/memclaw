#!/usr/bin/env node
/**
 * Interactive first-time setup. Creates `.env` from `.env.example`, captures an
 * OpenAI key, and optionally enables browser use. Safe to run repeatedly.
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const PINK = '\x1b[35m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const exists = async (p) =>
  access(p, constants.F_OK).then(() => true).catch(() => false);

/** Replace `KEY=...` line in an .env string, or append it if absent. */
function setEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.endsWith('\n') ? `${content}${line}\n` : `${content}\n${line}\n`;
}

async function main() {
  console.log(`\n${PINK}🐾 memclaw setup${RESET}\n`);

  if (!(await exists('.env.example'))) {
    console.error('Could not find .env.example — are you in the project root?');
    process.exit(1);
  }

  let env = (await exists('.env'))
    ? await readFile('.env', 'utf8')
    : await readFile('.env.example', 'utf8');

  // Key passed as an argument: `npm run setup sk-...` — set it and stop.
  // Works even when .env exists and stdin isn't a TTY.
  const argKey = process.argv[2]?.trim();
  if (argKey && argKey.startsWith('sk-')) {
    env = setEnv(env, 'OPENAI_API_KEY', argKey);
    await writeFile('.env', env);
    console.log(`${GREEN}✓${RESET} Saved OPENAI_API_KEY to .env. Restart the server to pick it up.`);
    return;
  }

  // Non-interactive (CI, piped): just materialize .env and stop.
  if (!stdin.isTTY) {
    if (!(await exists('.env'))) {
      await writeFile('.env', env);
      console.log(`${GREEN}✓${RESET} Created .env from template. Edit it to add OPENAI_API_KEY.`);
    } else {
      console.log(`${DIM}.env already exists; leaving it untouched.${RESET}`);
    }
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  // 1) OpenAI key
  const currentKey = (env.match(/^OPENAI_API_KEY=(.*)$/m) || [])[1] || '';
  const keyIsPlaceholder = !currentKey || /your-(openai-)?api-key/.test(currentKey);
  if (keyIsPlaceholder) {
    const key = (await rl.question('OpenAI API key (sk-…, blank to skip): ')).trim();
    if (key) env = setEnv(env, 'OPENAI_API_KEY', key);
  } else {
    console.log(`${GREEN}✓${RESET} OPENAI_API_KEY already set.`);
  }

  // 2) Browser use
  const browser = (await rl.question('Enable browser use? (real Playwright browser) [y/N]: '))
    .trim()
    .toLowerCase();
  if (browser === 'y' || browser === 'yes') {
    env = setEnv(env, 'MEMCLAW_BROWSER', 'true');
    console.log(
      `${DIM}  → after setup, run: npx playwright install chromium${RESET}`,
    );
  }

  await writeFile('.env', env);
  rl.close();

  console.log(`\n${GREEN}✓ Wrote .env${RESET}`);
  console.log(`\nNext steps:`);
  console.log(`  ${PINK}npm run chat${RESET}   ${DIM}— talk to memclaw in your terminal${RESET}`);
  console.log(`  ${PINK}npm run dev${RESET}    ${DIM}— open Mastra Studio (traces, memory, metrics)${RESET}`);
  console.log(`  ${PINK}npm run doctor${RESET} ${DIM}— verify your configuration${RESET}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
