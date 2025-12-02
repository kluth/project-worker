import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import { db } from '../db.js';
import { randomUUID } from 'crypto';
import { AuditService } from '../services/auditService.js';

export class LocalProvider implements ProjectProvider {
  name = 'local';

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = await db.getTasks();
    
    if (filter) {
      if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
      if (filter.priority) tasks = tasks.filter(t => t.priority === filter.priority);
      if (filter.assignee) tasks = tasks.filter(t => t.assignee?.toLowerCase().includes(filter.assignee!.toLowerCase()));
      if (filter.search) {
        const term = filter.search.toLowerCase();
        tasks = tasks.filter(t => t.title.toLowerCase().includes(term) || t.description.toLowerCase().includes(term));
      }
      // ... handle other filters
    }
    return tasks;
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return db.getTaskById(id);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      type: input.type || 'task',
      assignee: input.assignee,
      tags: input.tags || [],
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      actualHours: 0,
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      createdAt: now,
      updatedAt: now
    };
    await db.addTask(newTask);
    return newTask;
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    const task = await db.getTaskById(input.id);
    if (!task) throw new Error(`Task ${input.id} not found`);

    const updated = { ...task, ...input, updatedAt: new Date().toISOString() };
    await db.updateTask(updated);
    
    // In a full refactor, Audit logging might happen in the tool layer or here.
    // For now, we keep it simple as this mimics the old db logic.
    
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return db.deleteTask(id);
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    const task = await db.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const newComment = {
      id: randomUUID(),
      author: 'LocalUser', // TODO: Configurable user
      content,
      timestamp: new Date().toISOString()
    };

    task.comments.push(newComment);
    task.updatedAt = new Date().toISOString();
    await db.updateTask(task);
    
    return task;
  }
}
