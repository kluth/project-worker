import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import type { Prince2Organization } from '../types.js';

export function registerDefinePrince2Organization(server: McpServer): void {
  server.registerTool(
    'define_prince2_organization',
    {
      description:
        'Define or update the PRINCE2 project organization structure with key roles and responsibilities.',
      inputSchema: z.object({
        executiveBoardMember: z
          .string()
          .describe('Executive/Board member (ultimate decision maker)'),
        projectManager: z.string().describe('Project Manager'),
        teamManager: z.string().describe('Team Manager'),
        seniorUser: z.string().optional().describe('Senior User representative'),
        seniorSupplier: z.string().optional().describe('Senior Supplier representative'),
        projectAssurance: z.string().optional().describe('Project Assurance role'),
        changeAuthority: z.string().optional().describe('Change Authority'),
      }).shape,
    },
    async ({
      executiveBoardMember,
      projectManager,
      teamManager,
      seniorUser,
      seniorSupplier,
      projectAssurance,
      changeAuthority,
    }) => {
      const config = await configManager.get();

      // Validate PRINCE2 methodology is active
      if (config.agileMethodology.type !== 'prince2') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: PRINCE2 methodology must be active to define organization structure. Use manage_agile_config to set methodology to prince2.',
            },
          ],
          isError: true,
        };
      }

      const isUpdate = !!config.prince2Organization;

      // Create or update organization structure
      const organization: Prince2Organization = {
        executiveBoardMember,
        projectManager,
        teamManager,
        seniorUser,
        seniorSupplier,
        projectAssurance,
        changeAuthority,
        createdAt: config.prince2Organization?.createdAt || new Date().toISOString(),
        updatedAt: isUpdate ? new Date().toISOString() : undefined,
      };

      config.prince2Organization = organization;
      await configManager.save(config);

      const roleCount =
        3 +
        (seniorUser ? 1 : 0) +
        (seniorSupplier ? 1 : 0) +
        (projectAssurance ? 1 : 0) +
        (changeAuthority ? 1 : 0);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Organization structure ${isUpdate ? 'updated' : 'defined'} successfully.\nExecutive: ${executiveBoardMember}\nProject Manager: ${projectManager}\nTeam Manager: ${teamManager}\nTotal roles defined: ${roleCount}`,
          },
        ],
      };
    },
  );
}
