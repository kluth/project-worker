import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';

export interface ProjectProvider {
  name: string;
  
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
  addComment(taskId: string, content: string): Promise<Task>;
  
  // Optional capabilities can throw 'Not Implemented' or return empty/false
}
