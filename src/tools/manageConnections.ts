import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerManageConnections(server: McpServer) {
  server.registerTool(
    'manage_connections',
    {
      description: 'Configure external tool integrations (GitHub, Jira, Trello, Asana).',
      inputSchema: z.object({
        action: z.enum(['set_active', 'configure', 'list']).describe('Action to perform'),
        provider: z.enum(['local', 'github', 'jira', 'trello', 'asana']).optional(),
        credentials: z.record(z.string()).optional().describe('Jira: email, token; Trello: key, token; Asana: token'),
        settings: z.record(z.string()).optional().describe('Jira: domain, projectKey; Trello: boardId; Asana: projectId'),
      }).shape,
    },
    async ({ action, provider, credentials, settings }) => {
      
      if (action === 'list') {
        const config = await configManager.get();
        // Mask secrets
        const safeList = config.providers.map(p => ({
          ...p,
          credentials: { ...p.credentials, token: '***', apiKey: '***', key: '***' }
        }));
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ active: config.activeProvider, configured: safeList }, null, 2) 
          }] 
        };
      }

      if (action === 'set_active') {
        if (!provider) return { isError: true, content: [{ type: 'text', text: 'Provider required' }] };
        await configManager.setActiveProvider(provider as any);
        return { content: [{ type: 'text', text: `Active provider set to ${provider}` }] };
      }

      if (action === 'configure') {
        if (!provider || !credentials) return { isError: true, content: [{ type: 'text', text: 'Provider and credentials required' }] };
        
        await configManager.setProviderConfig({
          provider: provider as any,
          enabled: true,
          credentials,
          settings
        });
        return { content: [{ type: 'text', text: `Configuration saved for ${provider}` }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}