import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Task, AuditLogEntry, Sprint, WikiPage, Discussion, Release } from './types.js';

const DB_DIR = path.join(os.homedir(), '.gemini-project-worker');
const DB_FILE = path.join(DB_DIR, 'project-worker.sqlite');
const LEGACY_DB_FILE = path.join(DB_DIR, 'db.json');

class SQLiteDatabase {
  private db: Database.Database;

  constructor() {
    // Ensure directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new Database(DB_FILE);
    this.init();
    this.migrateFromLegacy();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        type TEXT,
        assignee TEXT,
        dueDate TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        source TEXT,
        url TEXT,
        parentId TEXT,
        sprintId TEXT,
        releaseId TEXT,
        gitBranch TEXT,
        estimatedHours REAL,
        actualHours REAL,
        tags TEXT, -- JSON
        comments TEXT, -- JSON
        checklists TEXT, -- JSON
        customFields TEXT, -- JSON
        blockedBy TEXT -- JSON
      );

      CREATE TABLE IF NOT EXISTS sprints (
        id TEXT PRIMARY KEY,
        name TEXT,
        startDate TEXT,
        endDate TEXT,
        status TEXT,
        goal TEXT
      );

      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        releaseDate TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        taskId TEXT,
        field TEXT,
        oldValue TEXT, -- JSON
        newValue TEXT, -- JSON
        changedBy TEXT,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS wiki_pages (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        title TEXT,
        content TEXT,
        tags TEXT, -- JSON
        lastUpdated TEXT
      );

      CREATE TABLE IF NOT EXISTS discussions (
        id TEXT PRIMARY KEY,
        title TEXT,
        status TEXT,
        messages TEXT, -- JSON
        tags TEXT, -- JSON
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
  }

  private migrateFromLegacy() {
    if (fs.existsSync(LEGACY_DB_FILE)) {
      try {
        const content = fs.readFileSync(LEGACY_DB_FILE, 'utf-8');
        const legacyData = JSON.parse(content);
        
        // Check if migration already happened (simple check: if tasks table is empty but legacy has tasks)
        const count = this.db.prepare('SELECT count(*) as c FROM tasks').get() as { c: number };
        if (count.c === 0 && legacyData.tasks?.length > 0) {
          console.log('Migrating legacy database to SQLite...');
          
          const insertTask = this.db.prepare(`
            INSERT INTO tasks (id, title, description, status, priority, type, assignee, dueDate, createdAt, updatedAt, source, url, parentId, sprintId, releaseId, gitBranch, estimatedHours, actualHours, tags, comments, checklists, customFields, blockedBy)
            VALUES (@id, @title, @description, @status, @priority, @type, @assignee, @dueDate, @createdAt, @updatedAt, @source, @url, @parentId, @sprintId, @releaseId, @gitBranch, @estimatedHours, @actualHours, @tags, @comments, @checklists, @customFields, @blockedBy)
          `);

          const insertSprint = this.db.prepare('INSERT INTO sprints (id, name, startDate, endDate, status, goal) VALUES (@id, @name, @startDate, @endDate, @status, @goal)');
          const insertRelease = this.db.prepare('INSERT INTO releases (id, name, status, releaseDate, description) VALUES (@id, @name, @status, @releaseDate, @description)');
          const insertAudit = this.db.prepare('INSERT INTO audit_logs (id, taskId, field, oldValue, newValue, changedBy, timestamp) VALUES (@id, @taskId, @field, @oldValue, @newValue, @changedBy, @timestamp)');
          const insertWiki = this.db.prepare('INSERT INTO wiki_pages (id, slug, title, content, tags, lastUpdated) VALUES (@id, @slug, @title, @content, @tags, @lastUpdated)');
          const insertDiscussion = this.db.prepare('INSERT INTO discussions (id, title, status, messages, tags, createdAt, updatedAt) VALUES (@id, @title, @status, @messages, @tags, @createdAt, @updatedAt)');

          const transaction = this.db.transaction(() => {
            legacyData.tasks?.forEach((t: any) => insertTask.run({
              ...t,
              tags: JSON.stringify(t.tags || []),
              comments: JSON.stringify(t.comments || []),
              checklists: JSON.stringify(t.checklists || []),
              customFields: JSON.stringify(t.customFields || {}),
              blockedBy: JSON.stringify(t.blockedBy || [])
            }));
            legacyData.sprints?.forEach((s: any) => insertSprint.run(s));
            legacyData.releases?.forEach((r: any) => insertRelease.run(r));
            legacyData.auditLogs?.forEach((a: any) => insertAudit.run({
              ...a,
              oldValue: JSON.stringify(a.oldValue),
              newValue: JSON.stringify(a.newValue)
            }));
            legacyData.wikiPages?.forEach((w: any) => insertWiki.run({ ...w, tags: JSON.stringify(w.tags || []) }));
            legacyData.discussions?.forEach((d: any) => insertDiscussion.run({ ...d, messages: JSON.stringify(d.messages || []), tags: JSON.stringify(d.tags || []) }));
          });

          transaction();
          console.log('Migration complete.');
          
          // Rename legacy file
          fs.renameSync(LEGACY_DB_FILE, `${LEGACY_DB_FILE}.bak`);
        }
      } catch (error) {
        console.error('Failed to migrate legacy database:', error);
      }
    }
  }

  // --- Helper to parse/stringify ---
  private parseTask(row: any): Task {
    return {
      ...row,
      tags: JSON.parse(row.tags),
      comments: JSON.parse(row.comments),
      checklists: JSON.parse(row.checklists),
      customFields: JSON.parse(row.customFields),
      blockedBy: JSON.parse(row.blockedBy),
    };
  }

  // --- Tasks ---

  async getTasks(): Promise<Task[]> {
    const rows = this.db.prepare('SELECT * FROM tasks').all();
    return rows.map(this.parseTask);
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) return undefined;
    return this.parseTask(row);
  }

  async addTask(task: Task): Promise<void> {
    this.db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, type, assignee, dueDate, createdAt, updatedAt, source, url, parentId, sprintId, releaseId, gitBranch, estimatedHours, actualHours, tags, comments, checklists, customFields, blockedBy)
      VALUES (@id, @title, @description, @status, @priority, @type, @assignee, @dueDate, @createdAt, @updatedAt, @source, @url, @parentId, @sprintId, @releaseId, @gitBranch, @estimatedHours, @actualHours, @tags, @comments, @checklists, @customFields, @blockedBy)
    `).run({
      ...task,
      tags: JSON.stringify(task.tags || []),
      comments: JSON.stringify(task.comments || []),
      checklists: JSON.stringify(task.checklists || []),
      customFields: JSON.stringify(task.customFields || {}),
      blockedBy: JSON.stringify(task.blockedBy || [])
    });
  }

  async updateTask(task: Task): Promise<void> {
    this.db.prepare(`
      UPDATE tasks SET 
        title = @title, description = @description, status = @status, priority = @priority, type = @type, 
        assignee = @assignee, dueDate = @dueDate, updatedAt = @updatedAt, source = @source, url = @url, 
        parentId = @parentId, sprintId = @sprintId, releaseId = @releaseId, gitBranch = @gitBranch, 
        estimatedHours = @estimatedHours, actualHours = @actualHours, tags = @tags, comments = @comments, 
        checklists = @checklists, customFields = @customFields, blockedBy = @blockedBy
      WHERE id = @id
    `).run({
      ...task,
      updatedAt: new Date().toISOString(), // Ensure update time is fresh if not set
      tags: JSON.stringify(task.tags || []),
      comments: JSON.stringify(task.comments || []),
      checklists: JSON.stringify(task.checklists || []),
      customFields: JSON.stringify(task.customFields || {}),
      blockedBy: JSON.stringify(task.blockedBy || [])
    });
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Sprints ---

  async getSprints(): Promise<Sprint[]> {
    return this.db.prepare('SELECT * FROM sprints').all() as Sprint[];
  }

  async addSprint(sprint: Sprint): Promise<void> {
    this.db.prepare('INSERT INTO sprints (id, name, startDate, endDate, status, goal) VALUES (@id, @name, @startDate, @endDate, @status, @goal)').run(sprint);
  }

  // --- Releases ---

  async getReleases(): Promise<Release[]> {
    return this.db.prepare('SELECT * FROM releases').all() as Release[];
  }

  async addRelease(release: Release): Promise<void> {
    this.db.prepare('INSERT INTO releases (id, name, status, releaseDate, description) VALUES (@id, @name, @status, @releaseDate, @description)').run(release);
  }

  // --- Audit Logs ---

  async addAuditLog(entry: AuditLogEntry): Promise<void> {
    this.db.prepare('INSERT INTO audit_logs (id, taskId, field, oldValue, newValue, changedBy, timestamp) VALUES (@id, @taskId, @field, @oldValue, @newValue, @changedBy, @timestamp)').run({
      ...entry,
      oldValue: JSON.stringify(entry.oldValue),
      newValue: JSON.stringify(entry.newValue)
    });
  }

  async getAuditLogsForTask(taskId: string): Promise<AuditLogEntry[]> {
    const rows = this.db.prepare('SELECT * FROM audit_logs WHERE taskId = ? ORDER BY timestamp DESC').all(taskId);
    return rows.map((row: any) => ({
      ...row,
      oldValue: JSON.parse(row.oldValue),
      newValue: JSON.parse(row.newValue)
    }));
  }

  // --- Wiki ---

  async getWikiPages(): Promise<WikiPage[]> {
    const rows = this.db.prepare('SELECT * FROM wiki_pages').all();
    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags)
    }));
  }

  async getWikiPageBySlug(slug: string): Promise<WikiPage | undefined> {
    const row = this.db.prepare('SELECT * FROM wiki_pages WHERE slug = ?').get(slug) as any;
    if (!row) return undefined;
    return { ...row, tags: JSON.parse(row.tags) } as WikiPage;
  }

  async saveWikiPage(page: WikiPage): Promise<void> {
    const exists = this.db.prepare('SELECT id FROM wiki_pages WHERE slug = ?').get(page.slug);
    if (exists) {
      this.db.prepare('UPDATE wiki_pages SET title = @title, content = @content, tags = @tags, lastUpdated = @lastUpdated WHERE slug = @slug').run({
        ...page,
        tags: JSON.stringify(page.tags)
      });
    } else {
      this.db.prepare('INSERT INTO wiki_pages (id, slug, title, content, tags, lastUpdated) VALUES (@id, @slug, @title, @content, @tags, @lastUpdated)').run({
        ...page,
        tags: JSON.stringify(page.tags)
      });
    }
  }

  // --- Discussions ---

  async getDiscussions(): Promise<Discussion[]> {
    const rows = this.db.prepare('SELECT * FROM discussions').all();
    return rows.map((row: any) => ({
      ...row,
      messages: JSON.parse(row.messages),
      tags: JSON.parse(row.tags)
    }));
  }

  async getDiscussionById(id: string): Promise<Discussion | undefined> {
    const row = this.db.prepare('SELECT * FROM discussions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      messages: JSON.parse(row.messages),
      tags: JSON.parse(row.tags)
    } as Discussion;
  }

  async saveDiscussion(discussion: Discussion): Promise<void> {
    const exists = this.db.prepare('SELECT id FROM discussions WHERE id = ?').get(discussion.id);
    if (exists) {
      this.db.prepare('UPDATE discussions SET title = @title, status = @status, messages = @messages, tags = @tags, updatedAt = @updatedAt WHERE id = @id').run({
        ...discussion,
        messages: JSON.stringify(discussion.messages),
        tags: JSON.stringify(discussion.tags)
      });
    } else {
      this.db.prepare('INSERT INTO discussions (id, title, status, messages, tags, createdAt, updatedAt) VALUES (@id, @title, @status, @messages, @tags, @createdAt, @updatedAt)').run({
        ...discussion,
        messages: JSON.stringify(discussion.messages),
        tags: JSON.stringify(discussion.tags)
      });
    }
  }
}

export const db = new SQLiteDatabase();
