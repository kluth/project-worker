/**
 * Shared type definitions for the Project Worker extension.
 */

export type TaskStatus =
  | 'todo'
  | 'in-progress'
  | 'blocked'
  | 'review'
  | 'done'
  | 'new'
  | 'active'
  | 'closed'
  | string; // Added string to allow loose mapping from providers
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | string; // Added string for flexibility
export type TaskType = 'epic' | 'story' | 'task' | 'subtask' | 'bug' | 'item' | 'feature' | string; // Added 'item' for Monday, 'feature' for Azure

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  taskId: string;
  field: string;
  oldValue: unknown; // Changed 'any' to 'unknown'
  newValue: unknown; // Changed 'any' to 'unknown'
  changedBy: string;
  timestamp: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  goal?: string;
}

export interface Release {
  id: string;
  name: string;
  status: 'planned' | 'released' | 'archived';
  releaseDate?: string;
  description?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  lastUpdated: string;
}

export interface DiscussionMessage {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface Discussion {
  id: string;
  title: string;
  status: 'open' | 'resolved' | 'closed';
  messages: DiscussionMessage[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  type: 'planning' | 'review' | 'stand-up' | 'retrospective' | 'demo' | 'other' | string;
  name: string;
  description?: string;
  startTime: string; // ISOString
  endTime: string; // ISOString
  attendees?: string[]; // List of assignee IDs or names
  relatedSprintId?: string;
  relatedTaskId?: string;
  location?: string;
  notificationSent?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  tags: string[];
  assignee?: string;
  dueDate?: string;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;

  // Optional source field for tracking where the task came from (useful for multi-provider views)
  source?: string;
  url?: string;

  // Hierarchy
  parentId?: string;

  // Time Tracking
  estimatedHours?: number;
  actualHours?: number;

  // Trello Style
  checklists: Checklist[];

  // GitHub Projects Style
  customFields: Record<string, string | number | boolean>;

  // Super Power fields
  blockedBy: string[];
  sprintId?: string;
  gitBranch?: string;
  releaseId?: string;
}

// Input types for tools
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assignee?: string;
  tags?: string[];
  dueDate?: string;
  sprintId?: string;
  blockedBy?: string[];
  parentId?: string;
  releaseId?: string;
  estimatedHours?: number;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assignee?: string;
  tags?: string[];
  dueDate?: string;
  sprintId?: string;
  blockedBy?: string[];
  parentId?: string;
  releaseId?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  search?: string;
  tags?: string[];
  sprintId?: string;
  releaseId?: string;
  parentId?: string;
  type?: TaskType;
}
