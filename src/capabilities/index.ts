/** Public surface of the capability system. */
export { defineCapability } from './types.ts';
export type { Capability, CapabilityEnvVar } from './types.ts';
export { builtinCapabilities } from './registry.ts';
export { loadCapabilities } from './loader.ts';
export type { CapabilityBundle, LoaderLogger } from './loader.ts';
