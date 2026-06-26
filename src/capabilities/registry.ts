/**
 * The built-in capability registry.
 *
 * To contribute a capability that ships with memclaw, add your folder under
 * `src/capabilities/<name>/`, export a `defineCapability(...)`, and add it to
 * this array. That's the whole contribution flow — type-safe and bundler-safe.
 *
 * (Capabilities published as separate npm packages don't go here; users enable
 * those via the MEMCLAW_CAPABILITIES env var. See docs/capabilities.md.)
 */
import type { Capability } from './types.ts';
import { timeCapability } from './time/index.ts';
import { webCapability } from './web/index.ts';
import { weatherCapability } from './weather/index.ts';
import { shellCapability } from './shell/index.ts';

export const builtinCapabilities: Capability[] = [
  timeCapability,
  webCapability,
  weatherCapability,
  shellCapability,
];
