import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerManageTeamHealth } from '../../src/tools/manageTeamHealth.js';
import { db } from '../../src/db.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    saveTeamSurvey: vi.fn(),
    getTeamSurveyById: vi.fn(),
    saveSurveyResponse: vi.fn(),
    getSurveyResponses: vi.fn(),
  },
}));

describe('Team Health Tools', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHandler = (toolName: string) => {
    return (mockServer.registerTool as vi.Mock).mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c[0] === toolName,
    )[2];
  };

  it('should create survey', async () => {
    registerManageTeamHealth(mockServer);
    const handler = getHandler('create_survey');

    await handler({
      title: 'Weekly Pulse',
      questions: [{ text: 'Mood?', type: 'rating' }],
    });

    expect(db.saveTeamSurvey).toHaveBeenCalled();
  });

  it('should submit response', async () => {
    registerManageTeamHealth(mockServer);
    const handler = getHandler('submit_survey_response');
    (db.getTeamSurveyById as vi.Mock).mockResolvedValue({
      id: 's1',
      status: 'open',
    });

    await handler({ surveyId: 's1', answers: { q1: 5 } });

    expect(db.saveSurveyResponse).toHaveBeenCalled();
  });

  it('should view results', async () => {
    registerManageTeamHealth(mockServer);
    const handler = getHandler('view_survey_results');
    (db.getTeamSurveyById as vi.Mock).mockResolvedValue({
      id: 's1',
      title: 'T',
      questions: [{ id: 'q1', text: 'Q', type: 'rating' }],
    });
    (db.getSurveyResponses as vi.Mock).mockResolvedValue([
      { answers: { q1: 5 } },
      { answers: { q1: 3 } },
    ]);

    const result = await handler({ surveyId: 's1' });
    expect(result.content[0].text).toContain('Average Rating: 4.0');
  });
});
