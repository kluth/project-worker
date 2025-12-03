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

// Waterfall Phase Management (Issue #11)
import { registerDefinePhase } from './tools/definePhase.js';
import { registerCompletePhase } from './tools/completePhase.js';
import { registerGetPhaseDetails } from './tools/getPhaseDetails.js';
registerDefinePhase(server);
registerCompletePhase(server);
registerGetPhaseDetails(server);

// Lean Methodology Management (Issue #12)
import { registerDefineValueStream } from './tools/defineValueStream.js';
import { registerTrackWaste } from './tools/trackWaste.js';
import { registerManagePdcaCycle } from './tools/managePdcaCycle.js';
registerDefineValueStream(server);
registerTrackWaste(server);
registerManagePdcaCycle(server);

// PRINCE2 Methodology Management (Issue #13)
import { registerDefineProjectBrief } from './tools/defineProjectBrief.js';
import { registerManageBusinessCase } from './tools/manageBusinessCase.js';
import { registerDefinePrince2Organization } from './tools/definePrince2Organization.js';
registerDefineProjectBrief(server);
registerManageBusinessCase(server);
registerDefinePrince2Organization(server);

// Retrospective & Feedback Tools (Issue #15)
import { registerStartRetrospective } from './tools/startRetrospective.js';
import { registerSubmitFeedback } from './tools/submitFeedback.js';
import { registerTrackRetroActions } from './tools/trackRetroActions.js';
registerStartRetrospective(server);
registerSubmitFeedback(server);
registerTrackRetroActions(server);

// Meeting Management Tools (Issue #16)
import { registerCreateMeeting } from './tools/createMeeting.js';
import { registerAddMeetingNote } from './tools/addMeetingNote.js';
import { registerSummarizeMeeting } from './tools/summarizeMeeting.js';
registerCreateMeeting(server);
registerAddMeetingNote(server);
registerSummarizeMeeting(server);

// Personal Productivity Tools (Issue #18)
import { registerPersonalProductivity } from './tools/personalProductivity.js';
registerPersonalProductivity(server);

// OKR Management Tools (Issue #19)
import { registerManageOKRs } from './tools/manageOKRs.js';
registerManageOKRs(server);

// Team Health & Sentiment (Issue #20)
import { registerManageTeamHealth } from './tools/manageTeamHealth.js';
registerManageTeamHealth(server);

// Pairing/Mob Programming (Issue #21)
import { registerManagePairing } from './tools/managePairing.js';
registerManagePairing(server);

// Visualization & Dashboard (Issue #10)
import { registerVisualizationTools } from './tools/visualization.js';
registerVisualizationTools(server);

// Code Scanner (Issue #38)
import { registerScanTodos } from './tools/scanTodos.js';
registerScanTodos(server);

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
