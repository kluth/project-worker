import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { PdcaCycle } from '../types.js';

export function registerManagePdcaCycle(server: McpServer): void {
  server.registerTool(
    'manage_pdca_cycle',
    {
      description:
        'Manage Plan-Do-Check-Act (PDCA) continuous improvement cycles for Lean methodology.',
      inputSchema: z.object({
        action: z
          .enum(['create', 'progress', 'list'])
          .describe('Action: create new cycle, progress to next phase, or list cycles'),
        cycleId: z.string().optional().describe('ID of the cycle (required for progress action)'),
        title: z.string().optional().describe('Title of the cycle (required for create)'),
        plan: z.string().optional().describe('Plan phase description (required for create)'),
        doNotes: z.string().optional().describe('Do phase notes (for progressing from Plan)'),
        checkNotes: z.string().optional().describe('Check phase notes (for progressing from Do)'),
        actNotes: z.string().optional().describe('Act phase notes (for progressing from Check)'),
      }).shape,
    },
    async ({ action, cycleId, title, plan, doNotes, checkNotes, actNotes }) => {
      const config = await configManager.get();

      // Validate Lean methodology is active
      if (config.agileMethodology.type !== 'lean') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: Lean methodology must be active to manage PDCA cycles. Use manage_agile_config to set methodology to lean.',
            },
          ],
          isError: true,
        };
      }

      // Handle different actions
      if (action === 'create') {
        if (!title || !plan) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: title and plan are required for create action.',
              },
            ],
            isError: true,
          };
        }

        const newCycle: PdcaCycle = {
          id: randomUUID(),
          title,
          currentPhase: 'plan',
          plan,
          createdAt: new Date().toISOString(),
        };

        config.pdcaCycles.push(newCycle);
        await configManager.save(config);

        return {
          content: [
            {
              type: 'text' as const,
              text: `PDCA cycle created successfully.\nID: ${newCycle.id}\nTitle: ${title}\nCurrent Phase: Plan`,
            },
          ],
        };
      }

      if (action === 'progress') {
        if (!cycleId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: cycleId is required for progress action.',
              },
            ],
            isError: true,
          };
        }

        const cycle = config.pdcaCycles.find((c) => c.id === cycleId);
        if (!cycle) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: PDCA cycle with ID ${cycleId} not found.`,
              },
            ],
            isError: true,
          };
        }

        // Progress through phases
        if (cycle.currentPhase === 'plan') {
          if (!doNotes) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: doNotes required to progress from Plan to Do phase.',
                },
              ],
              isError: true,
            };
          }
          cycle.doNotes = doNotes;
          cycle.currentPhase = 'do';
          await configManager.save(config);
          return {
            content: [
              {
                type: 'text' as const,
                text: `PDCA cycle "${cycle.title}" progressed to Do phase.`,
              },
            ],
          };
        }

        if (cycle.currentPhase === 'do') {
          if (!checkNotes) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: checkNotes required to progress from Do to Check phase.',
                },
              ],
              isError: true,
            };
          }
          cycle.checkNotes = checkNotes;
          cycle.currentPhase = 'check';
          await configManager.save(config);
          return {
            content: [
              {
                type: 'text' as const,
                text: `PDCA cycle "${cycle.title}" progressed to Check phase.`,
              },
            ],
          };
        }

        if (cycle.currentPhase === 'check') {
          if (!actNotes) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: actNotes required to progress from Check to Act phase.',
                },
              ],
              isError: true,
            };
          }
          cycle.actNotes = actNotes;
          cycle.currentPhase = 'completed';
          cycle.completedAt = new Date().toISOString();
          await configManager.save(config);
          return {
            content: [
              {
                type: 'text' as const,
                text: `PDCA cycle "${cycle.title}" completed successfully.`,
              },
            ],
          };
        }

        if (cycle.currentPhase === 'completed') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Cycle "${cycle.title}" is already completed.`,
              },
            ],
            isError: true,
          };
        }
      }

      if (action === 'list') {
        if (config.pdcaCycles.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No PDCA cycles found.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(config.pdcaCycles, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: Invalid action specified.',
          },
        ],
        isError: true,
      };
    },
  );
}
