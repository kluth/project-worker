import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { PairingSession } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManagePairing(server: McpServer): void {
  // Schedule Session
  server.registerTool(
    'schedule_pairing_session',
    {
      description: 'Schedule a pair/mob programming session.',
      inputSchema: z.object({
        participants: z.array(z.string()).describe('List of participant names'),
        topic: z.string().optional(),
        startTime: z.string().optional().describe('ISO string, defaults to now'),
        rotationIntervalMinutes: z.number().optional().describe('Rotation timer'),
      }).shape,
    },
    async ({ participants, topic, startTime, rotationIntervalMinutes }) => {
      const session: PairingSession = {
        id: randomUUID(),
        participants,
        topic,
        startTime: startTime || new Date().toISOString(),
        rotationIntervalMinutes,
        status: 'scheduled',
        currentDriver: participants[0],
        currentNavigator: participants[1],
      };

      await db.savePairingSession(session);
      return {
        content: [
          {
            type: 'text',
            text: `Pairing session scheduled: "${topic || 'Untitled'}" (ID: ${session.id})`,
          },
        ],
      };
    },
  );

  // Start/Manage Session
  server.registerTool(
    'manage_pairing_session',
    {
      description: 'Manage an active pairing session (start, rotate, end).',
      inputSchema: z.object({
        sessionId: z.string().describe('ID of the session'),
        action: z.enum(['start', 'rotate', 'end']).describe('Action to perform'),
        notes: z.string().optional().describe('Notes to append'),
      }).shape,
    },
    async ({ sessionId, action, notes }) => {
      const session = await db.getPairingSessionById(sessionId);
      if (!session)
        return {
          isError: true,
          content: [{ type: 'text', text: 'Session not found' }],
        };

      if (notes) {
        session.notes = (session.notes ? session.notes + '\n' : '') + notes;
      }

      if (action === 'start') {
        session.status = 'active';
        session.startTime = new Date().toISOString(); // Update actual start
      }

      if (action === 'rotate') {
        // Simple rotation logic: move first to last
        const first = session.participants.shift();
        if (first) session.participants.push(first);
        session.currentDriver = session.participants[0];
        session.currentNavigator = session.participants[1];
      }

      if (action === 'end') {
        session.status = 'completed';
        session.endTime = new Date().toISOString();
      }

      await db.savePairingSession(session);

      let message = `Session ${action}ed.`;
      if (action === 'rotate') {
        message = `Rotated! Driver: ${session.currentDriver}, Navigator: ${session.currentNavigator}`;
      }

      return { content: [{ type: 'text', text: message }] };
    },
  );
}
