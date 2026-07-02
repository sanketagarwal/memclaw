/** Public surface for building multi-agent systems. See docs/multi-agent.md. */
export { createAgentMemory } from './memory.ts';
export type { AgentMemoryOptions } from './memory.ts';
export { defineSpecialist, defineOrchestrator } from './team.ts';
export type { SpecialistSpec, OrchestratorSpec } from './team.ts';
export { createResearchTeam } from './example.ts';
