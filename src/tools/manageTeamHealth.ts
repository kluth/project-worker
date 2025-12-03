import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { TeamSurvey, SurveyResponse, SurveyQuestion } from '../types.js';
import { randomUUID } from 'crypto';
import os from 'os';

export function registerManageTeamHealth(server: McpServer): void {
  // Create Survey
  server.registerTool(
    'create_survey',
    {
      description: 'Create a new team health/sentiment survey.',
      inputSchema: z.object({
        title: z.string().describe('Title of the survey'),
        questions: z
          .array(
            z.object({
              text: z.string(),
              type: z.enum(['rating', 'text', 'choice']),
              options: z.array(z.string()).optional(),
            }),
          )
          .describe('List of questions'),
        endDate: z.string().optional().describe('End date (ISO string)'),
      }).shape,
    },
    async ({ title, questions, endDate }) => {
      // Map simple input to SurveyQuestion
      const surveyQuestions: SurveyQuestion[] = questions.map((q) => ({
        id: randomUUID(),
        text: q.text,
        type: q.type,
        options: q.options,
      }));

      let creator = 'unknown';
      try {
        creator = os.userInfo().username;
      } catch {
        // ignore
      }

      const survey: TeamSurvey = {
        id: randomUUID(),
        title,
        questions: surveyQuestions,
        createdBy: creator,
        createdAt: new Date().toISOString(),
        endDate,
        status: 'open',
      };

      await db.saveTeamSurvey(survey);
      return {
        content: [
          {
            type: 'text',
            text: `Survey created: "${title}" (ID: ${survey.id})`,
          },
        ],
      };
    },
  );

  // Submit Response
  server.registerTool(
    'submit_survey_response',
    {
      description: 'Submit a response to a survey.',
      inputSchema: z.object({
        surveyId: z.string().describe('ID of the survey'),
        answers: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .describe('Map of questionId to answer'),
        anonymous: z.boolean().default(true).describe('Submit anonymously?'),
      }).shape,
    },
    async ({ surveyId, answers, anonymous }) => {
      const survey = await db.getTeamSurveyById(surveyId);
      if (!survey)
        return {
          isError: true,
          content: [{ type: 'text', text: 'Survey not found' }],
        };

      if (survey.status === 'closed')
        return {
          isError: true,
          content: [{ type: 'text', text: 'Survey is closed' }],
        };

      let respondent: string | undefined;
      if (!anonymous) {
        try {
          respondent = os.userInfo().username;
        } catch {
          // ignore
        }
      }

      const response: SurveyResponse = {
        id: randomUUID(),
        surveyId,
        answers,
        respondent,
        submittedAt: new Date().toISOString(),
      };

      await db.saveSurveyResponse(response);
      return { content: [{ type: 'text', text: 'Response submitted.' }] };
    },
  );

  // View Results
  server.registerTool(
    'view_survey_results',
    {
      description: 'View aggregated results of a survey.',
      inputSchema: z.object({
        surveyId: z.string().describe('ID of the survey'),
      }).shape,
    },
    async ({ surveyId }) => {
      const survey = await db.getTeamSurveyById(surveyId);
      if (!survey)
        return {
          isError: true,
          content: [{ type: 'text', text: 'Survey not found' }],
        };

      const responses = await db.getSurveyResponses(surveyId);
      const count = responses.length;

      if (count === 0)
        return {
          content: [
            {
              type: 'text',
              text: `Survey: "${survey.title}"
No responses yet.`,
            },
          ],
        };

      let report = `Results for "${survey.title}" (${count} responses):\n\n`;

      survey.questions.forEach((q) => {
        report += `Q: ${q.text}\n`;
        if (q.type === 'rating') {
          const values = responses
            .map((r) => r.answers[q.id])
            .filter((v): v is number => typeof v === 'number');
          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            report += `  Average Rating: ${avg.toFixed(1)} / 5\n`;
          } else {
            report += `  No data\n`;
          }
        } else if (q.type === 'choice') {
          const counts: Record<string, number> = {};
          responses.forEach((r) => {
            const ans = String(r.answers[q.id]);
            counts[ans] = (counts[ans] || 0) + 1;
          });
          Object.entries(counts).forEach(([opt, c]) => {
            report += `  - ${opt}: ${c}\n`;
          });
        } else {
          // text
          report += `  (Text responses hidden in summary view)\n`;
        }
        report += '\n';
      });

      return { content: [{ type: 'text', text: report }] };
    },
  );
}
