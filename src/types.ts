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
  | 'backlog'
  | 'ready for dev'
  | 'in progress'
  | 'qa'
  | 'to do'
  | 'doing'
  | 'completed'
  | string;
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | string; // Added string for flexibility
export type TaskType =
  | 'epic'
  | 'story'
  | 'task'
  | 'subtask'
  | 'bug'
  | 'item'
  | 'feature'
  | 'initiative'
  | 'spike'
  | 'request'
  | 'change'
  | string;

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
  source?: string;
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
  source?: string;
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

// Waterfall methodology types
export type WaterfallPhaseStatus = 'not-started' | 'in-progress' | 'completed';

export interface WaterfallPhase {
  id: string;
  name: string;
  description: string;
  order: number; // Determines sequential flow
  status: WaterfallPhaseStatus;
  gateChecks: string[]; // Gate criteria that must be met
  startDate?: string;
  endDate?: string;
  deliverables?: string[];
  approver?: string;
}

// Lean methodology types
export type WasteType =
  | 'defects'
  | 'overproduction'
  | 'waiting'
  | 'non-utilized-talent'
  | 'transportation'
  | 'inventory'
  | 'motion'
  | 'extra-processing';

export interface ValueStream {
  id: string;
  name: string;
  description: string;
  stages: string[]; // Sequential stages in the value stream
  metrics?: Record<string, number>; // e.g., leadTime, cycleTime, processTime
  createdAt: string;
}

export interface WasteItem {
  id: string;
  type: WasteType; // One of the 7+1 types of waste (Muda)
  description: string;
  location?: string; // Where the waste occurs
  impact?: 'low' | 'medium' | 'high';
  mitigation?: string; // Proposed mitigation plan
  identifiedAt: string;
  resolvedAt?: string;
}

export type PdcaPhase = 'plan' | 'do' | 'check' | 'act' | 'completed';

export interface PdcaCycle {
  id: string;
  title: string;
  currentPhase: PdcaPhase;
  plan: string; // Plan phase description
  doNotes?: string; // Do phase notes
  checkNotes?: string; // Check phase notes
  actNotes?: string; // Act phase notes
  createdAt: string;
  completedAt?: string;
}

// PRINCE2 methodology types
export interface ProjectBrief {
  background: string; // Project background and context
  objectives: string[]; // Project objectives
  deliverables: string[]; // Expected deliverables
  scope?: string; // Project scope
  constraints?: string[]; // Project constraints
  assumptions?: string[]; // Project assumptions
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessCase {
  executiveSummary: string;
  reasons: string[]; // Reasons for the project
  benefits: string[]; // Expected benefits
  costs: number; // Estimated costs
  timescale: string; // Project timescale
  risks?: string[]; // Major risks
  options?: string[]; // Options considered
  createdAt: string;
  updatedAt?: string;
}

export interface Prince2Organization {
  executiveBoardMember: string; // Executive (ultimate decision maker)
  projectManager: string; // Project Manager
  teamManager: string; // Team Manager
  seniorUser?: string; // Senior User
  seniorSupplier?: string; // Senior Supplier
  projectAssurance?: string; // Project Assurance role
  changeAuthority?: string; // Change Authority
  createdAt: string;
  updatedAt?: string;
}
