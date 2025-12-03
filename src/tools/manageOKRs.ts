import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { Objective, KeyResult } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManageOKRs(server: McpServer): void {
  // Define Objective
  server.registerTool(
    'define_objective',
    {
      description: 'Define a new Objective.',
      inputSchema: z.object({
        title: z.string().describe('The objective title'),
        description: z.string().optional(),
        level: z.enum(['company', 'team', 'individual']),
        owner: z.string().optional(),
      }).shape,
    },
    async ({ title, description, level, owner }) => {
      const objective: Objective = {
        id: randomUUID(),
        title,
        description,
        level,
        owner,
        status: 'active',
        createdAt: new Date().toISOString(),
        keyResults: [],
      };
      await db.saveObjective(objective);
      return {
        content: [
          {
            type: 'text',
            text: `Objective defined: "${title}" (ID: ${objective.id})`,
          },
        ],
      };
    },
  );

  // Add Key Result
  server.registerTool(
    'add_key_result',
    {
      description: 'Add a Key Result to an Objective.',
      inputSchema: z.object({
        objectiveId: z.string().describe('ID of the objective'),
        title: z.string().describe('The key result title'),
        target: z.number(),
        current: z.number().default(0),
        unit: z.string().describe('Unit of measurement (e.g., %, users)'),
      }).shape,
    },
    async ({ objectiveId, title, target, current, unit }) => {
      const objective = await db.getObjectiveById(objectiveId);
      if (!objective)
        return {
          isError: true,
          content: [{ type: 'text', text: 'Objective not found' }],
        };

      const kr: KeyResult = {
        id: randomUUID(),
        objectiveId,
        title,
        target,
        current,
        unit,
        status: 'on-track', // Default
      };
      await db.saveKeyResult(kr);
      return {
        content: [{ type: 'text', text: `Key Result added: "${title}"` }],
      };
    },
  );

  // Update Key Result
  server.registerTool(
    'update_key_result',
    {
      description: 'Update progress of a Key Result.',
      inputSchema: z.object({
        id: z.string().describe('ID of the key result'),
        current: z.number().describe('Current value'),
        status: z.enum(['on-track', 'at-risk', 'behind', 'completed']).optional(),
      }).shape,
    },
    async ({ id, current, status }) => {
      const kr = await db.getKeyResultById(id);
      if (!kr)
        return {
          isError: true,
          content: [{ type: 'text', text: 'Key Result not found' }],
        };

      kr.current = current;
      if (status) kr.status = status;
      // Auto-update status if completed?
      if (kr.current >= kr.target && !status) kr.status = 'completed';

      await db.saveKeyResult(kr);
      return {
        content: [
          {
            type: 'text',
            text: `Key Result updated: ${kr.current}/${kr.target} ${kr.unit}`,
          },
        ],
      };
    },
  );

  // View OKRs
  server.registerTool(
    'view_okrs',
    {
      description: 'View OKRs.',
      inputSchema: z.object({
        level: z.enum(['company', 'team', 'individual']).optional(),
      }).shape,
    },
    async ({ level }) => {
      let objectives = await db.getObjectives();
      if (level) {
        objectives = objectives.filter((o) => o.level === level);
      }

      if (objectives.length === 0) return { content: [{ type: 'text', text: 'No OKRs found.' }] };

      // Format output
      const lines = objectives.map((o) => {
        const krs =
          o.keyResults
            ?.map(
              (k) =>
                `  - [${k.status.toUpperCase()}] ${k.title}: ${k.current}/${k.target} ${k.unit}`,
            )
            .join('\n') || '  (No Key Results)';
        return `[${o.level.toUpperCase()}] ${o.title} (${o.status})\n${krs}`;
      });

      return {
        content: [{ type: 'text', text: lines.join('\n\n') }],
      };
    },
  );
}
