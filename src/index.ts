/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerGetTasks } from './tools/getTasks.js';
import { registerCreateTask } from './tools/createTask.js';
import { registerUpdateTask } from './tools/updateTask.js';
import { registerDeleteTask } from './tools/deleteTask.js';
import { registerAddComment } from './tools/addComment.js';
import { registerSearchTasks } from './tools/searchTasks.js';
import { registerGetProjectStats } from './tools/getProjectStats.js';
import { registerManageDependencies } from './tools/manageDependencies.js';
import { registerManageSprints } from './tools/manageSprints.js';
import { registerGitTools } from './tools/gitTools.js';
import { registerGetTaskHistory } from './tools/getTaskHistory.js';
import { registerManageWiki } from './tools/manageWiki.js';
import { registerManageDiscussions } from './tools/manageDiscussions.js';
import { registerManageReleases } from './tools/manageReleases.js';
import { registerLogWork } from './tools/logWork.js';
import { registerManageChecklists } from './tools/manageChecklists.js';
import { registerCustomFields } from './tools/customFields.js';
import { registerTicketGenerator } from './prompts/ticketGenerator.js';
import { registerManageConnections } from './tools/manageConnections.js';

export const server = new McpServer({
  name: 'project-worker',
  version: '5.0.0',
});

// Integration Management
registerManageConnections(server);

// Agile Configuration
import { registerManageAgileConfig } from './tools/manageAgileConfig.js';
registerManageAgileConfig(server);

// Core Tasks (Provider Aware)
registerGetTasks(server);
registerCreateTask(server);

// Local-Only Tools (for now)
// Note: In a full implementation, these would also delegate to the provider
registerUpdateTask(server);
registerDeleteTask(server);
registerAddComment(server);
registerSearchTasks(server);
registerGetProjectStats(server);
registerGetTaskHistory(server);

// Knowledge & Communication
registerManageWiki(server);
registerManageDiscussions(server);

// Advanced Features
registerManageDependencies(server);
registerManageSprints(server); // Existing sprint tool
registerGitTools(server);

// Event Management (New Tools)
import { registerScheduleEvent } from './tools/scheduleEvent.js';
import { registerGetEvents } from './tools/getEvents.js';
registerScheduleEvent(server);
registerGetEvents(server);

// Kanban Management (New Tools)
import { registerSetWipLimit } from './tools/setWipLimit.js';
import { registerGetBoardStatus } from './tools/getBoardStatus.js';
registerSetWipLimit(server);
registerGetBoardStatus(server);

// Sprint Management (New Tools)
import { registerStartSprint } from './tools/startSprint.js';
import { registerEndSprint } from './tools/endSprint.js';
import { registerGetSprintDetails } from './tools/getSprintDetails.js';
registerStartSprint(server);
registerEndSprint(server);
registerGetSprintDetails(server);

// Enterprise Features
registerManageReleases(server);
registerLogWork(server);
registerManageChecklists(server);
registerCustomFields(server);

// Prompts
registerTicketGenerator(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
