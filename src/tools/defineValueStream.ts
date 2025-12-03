import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { ValueStream } from '../types.js';

export function registerDefineValueStream(server: McpServer): void {
  server.registerTool(
    'define_value_stream',
    {
      description:
        'Define a value stream map for Lean methodology, showing the flow of value from start to finish.',
      inputSchema: z.object({
        name: z.string().describe('Name of the value stream'),
        description: z.string().optional().describe('Detailed description of the value stream'),
        stages: z.array(z.string()).describe('Sequential stages in the value stream'),
        metrics: z
          .record(z.number())
          .optional()
          .describe('Metrics like leadTime, cycleTime, processTime (in days)'),
      }).shape,
    },
    async ({ name, description, stages, metrics }) => {
      const config = await configManager.get();

      // Validate Lean methodology is active
      if (config.agileMethodology.type !== 'lean') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: Lean methodology must be active to define value streams. Use manage_agile_config to set methodology to lean.',
            },
          ],
          isError: true,
        };
      }

      // Check for duplicate value stream names
      const existingStream = config.valueStreams.find((vs) => vs.name === name);
      if (existingStream) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Value stream with name "${name}" already exists.`,
            },
          ],
          isError: true,
        };
      }

      // Create new value stream
      const newStream: ValueStream = {
        id: randomUUID(),
        name,
        description: description || '',
        stages,
        metrics,
        createdAt: new Date().toISOString(),
      };

      config.valueStreams.push(newStream);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Value stream "${name}" defined successfully.\nID: ${newStream.id}\nStages: ${stages.length}\nMetrics: ${metrics ? Object.keys(metrics).join(', ') : 'None'}`,
          },
        ],
      };
    },
  );
}
