import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerCompletePhase(server: McpServer): void {
  server.registerTool(
    'complete_phase',
    {
      description:
        'Mark a Waterfall phase as completed and automatically start the next phase in sequence.',
      inputSchema: z
        .object({
          phaseId: z.string().describe('ID of the phase to complete'),
          notes: z.string().optional().describe('Completion notes or comments'),
        }).shape,
    },
    async ({ phaseId, notes }) => {

      const config = await configManager.get();

      // Find the phase
      const phase = config.waterfallPhases.find((p) => p.id === phaseId);
      if (!phase) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Phase with ID ${phaseId} not found.`,
            },
          ],
          isError: true,
        };
      }

      // Validate phase is in-progress
      if (phase.status !== 'in-progress') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Phase must be in-progress to be completed. Current status: ${phase.status}`,
            },
          ],
          isError: true,
        };
      }

      // Complete the phase
      phase.status = 'completed';
      phase.endDate = new Date().toISOString();

      // Find and start next phase
      const sortedPhases = config.waterfallPhases.sort((a, b) => a.order - b.order);
      const currentIndex = sortedPhases.findIndex((p) => p.id === phaseId);
      const nextPhase = sortedPhases[currentIndex + 1];

      let nextPhaseMessage = '';
      if (nextPhase && nextPhase.status === 'not-started') {
        nextPhase.status = 'in-progress';
        nextPhase.startDate = new Date().toISOString();
        nextPhaseMessage = `\nNext phase "${nextPhase.name}" has been automatically started.`;
      }

      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Phase "${phase.name}" completed successfully.${notes ? '\nNotes: ' + notes : ''}${nextPhaseMessage}`,
          },
        ],
      };
    },
  );
}
