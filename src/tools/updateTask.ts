export function registerUpdateTask(server: McpServer): void {
  // Add void return type
  server.registerTool(
    'update_task',
    {
      description: 'Updates an existing task. Logs changes to history.',
      inputSchema: z.object({
        id: z.string().describe('The ID of the task to update'),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['todo', 'in-progress', 'blocked', 'review', 'done']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        type: z.enum(['epic', 'story', 'task', 'subtask', 'bug']).optional(),
        assignee: z.string().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        sprintId: z.string().optional(),
        parentId: z.string().optional(),
        releaseId: z.string().optional(),
        estimatedHours: z.number().optional(),
      }).shape,
    },
    async (input: UpdateTaskInput) => {
      const task = await db.getTaskById(input.id);

      if (!task) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Task with ID ${input.id} not found.` }],
        };
      }

      const oldTask = { ...task };
      const updatedTask = {
        ...task,
        ...input,
        updatedAt: new Date().toISOString(),
      };

      // Log changes for specific fields
      const fieldsToTrack = [
        'title',
        'description',
        'status',
        'priority',
        'assignee',
        'dueDate',
        'sprintId',
        'type',
        'parentId',
        'releaseId',
        'estimatedHours',
      ] as const;

      for (const field of fieldsToTrack) {
        if (input[field] !== undefined) {
          const oldFieldValue = oldTask[field as keyof typeof oldTask]; // Type-safe access
          const newFieldValue = input[field];

          // Only log if the value actually changed
          if (oldFieldValue !== newFieldValue) {
            await AuditService.logChange(input.id, field, oldFieldValue, newFieldValue);
          }
        }
      }

      if (input.tags) {
        // Compare tags as arrays
        const oldTags = oldTask.tags || [];
        const newTags = input.tags || [];
        if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
          await AuditService.logChange(input.id, 'tags', oldTags, newTags);
        }
      }

      await db.updateTask(updatedTask);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedTask, null, 2),
          },
        ],
      };
    },
  );
}
