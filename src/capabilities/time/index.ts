import { defineCapability } from '../types.ts';
import { datetimeTool } from './datetime-tool.ts';

export const timeCapability = defineCapability({
  id: 'time',
  name: 'Time',
  description: 'Gives the agent an accurate sense of the current date and time.',
  version: '0.1.0',
  author: 'memclaw',
  tools: { datetime: datetimeTool },
});
