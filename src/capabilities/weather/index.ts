import { defineCapability } from '../types.ts';
import { weatherTool } from './weather-tool.ts';

export const weatherCapability = defineCapability({
  id: 'weather',
  name: 'Weather',
  description: 'Look up current weather for any location. A small reference capability.',
  version: '0.1.0',
  author: 'memclaw',
  tools: { weather: weatherTool },
});
