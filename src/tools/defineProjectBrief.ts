import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import type { ProjectBrief } from '../types.js';

export function registerDefineProjectBrief(server: McpServer): void {
  server.registerTool(
    'define_project_brief',
    {
      description:
        'Define or update the PRINCE2 Project Brief outlining project background, objectives, deliverables, and scope.',
      inputSchema: z.object({
        background: z.string().describe('Project background and context'),
        objectives: z.array(z.string()).describe('Project objectives'),
        deliverables: z.array(z.string()).optional().describe('Expected deliverables'),
        scope: z.string().optional().describe('Project scope definition'),
        constraints: z.array(z.string()).optional().describe('Project constraints'),
        assumptions: z.array(z.string()).optional().describe('Project assumptions'),
      }).shape,
    },
    async ({ background, objectives, deliverables, scope, constraints, assumptions }) => {
      const config = await configManager.get();

      // Validate PRINCE2 methodology is active
      if (config.agileMethodology.type !== 'prince2') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: PRINCE2 methodology must be active to define project brief. Use manage_agile_config to set methodology to prince2.',
            },
          ],
          isError: true,
        };
      }

      const isUpdate = !!config.projectBrief;

      // Create or update project brief
      const projectBrief: ProjectBrief = {
        background,
        objectives,
        deliverables: deliverables || [],
        scope,
        constraints,
        assumptions,
        createdAt: config.projectBrief?.createdAt || new Date().toISOString(),
        updatedAt: isUpdate ? new Date().toISOString() : undefined,
      };

      config.projectBrief = projectBrief;
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Project brief ${isUpdate ? 'updated' : 'defined'} successfully.\nObjectives: ${objectives.length}\nDeliverables: ${deliverables?.length || 0}${scope ? '\nScope: Defined' : ''}`,
          },
        ],
      };
    },
  );
}
