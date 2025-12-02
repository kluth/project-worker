import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Task, AuditLogEntry, Sprint, WikiPage, Discussion, Release } from './types.js';

const DB_DIR = path.join(os.homedir(), '.gemini-project-worker');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  tasks: Task[];
  sprints: Sprint[];
  releases: Release[];
  auditLogs: AuditLogEntry[];
  wikiPages: WikiPage[];
  discussions: Discussion[];
  lastUpdated: string;
}

class Database {
  private data: DatabaseSchema | null = null;

  private async ensureDbExists() {
    try {
      await fs.access(DB_FILE);
    } catch {
      await fs.mkdir(DB_DIR, { recursive: true });
      await this.save({
        tasks: [],
        sprints: [],
        releases: [],
        auditLogs: [],
        wikiPages: [],
        discussions: [],
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  private async load(): Promise<DatabaseSchema> {
    if (this.data) return this.data;
    await this.ensureDbExists();
    const content = await fs.readFile(DB_FILE, 'utf-8');
    try {
      const parsedData: DatabaseSchema = JSON.parse(content);
      // Migrations
      parsedData.sprints = parsedData.sprints || [];
      parsedData.releases = parsedData.releases || [];
      parsedData.auditLogs = parsedData.auditLogs || [];
      parsedData.wikiPages = parsedData.wikiPages || [];
      parsedData.discussions = parsedData.discussions || [];
      this.data = parsedData;
      return parsedData;
    } catch (error: unknown) {
      // Use unknown for caught error
      console.warn('Database corrupted, resetting...', error); // Changed to console.warn and added error
      const defaultData: DatabaseSchema = {
        tasks: [],
        sprints: [],
        releases: [],
        auditLogs: [],
        wikiPages: [],
        discussions: [],
        lastUpdated: new Date().toISOString(),
      };
      this.data = defaultData;
      return defaultData;
    }
  }

  private async save(data: DatabaseSchema) {
    this.data = data;
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- Tasks ---

  async getTasks(): Promise<Task[]> {
    const db = await this.load();
    return db.tasks;
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const db = await this.load();
    return db.tasks.find((t) => t.id === id);
  }

  async addTask(task: Task): Promise<void> {
    const db = await this.load();
    db.tasks.push(task);
    db.lastUpdated = new Date().toISOString();
    await this.save(db);
  }

  async updateTask(updatedTask: Task): Promise<void> {
    const db = await this.load();
    const index = db.tasks.findIndex((t) => t.id === updatedTask.id);
    if (index !== -1) {
      db.tasks[index] = updatedTask;
      db.lastUpdated = new Date().toISOString();
      await this.save(db);
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    const db = await this.load();
    const initialLength = db.tasks.length;
    db.tasks = db.tasks.filter((t) => t.id !== id);
    if (db.tasks.length !== initialLength) {
      db.lastUpdated = new Date().toISOString();
      await this.save(db);
      return true;
    }
    return false;
  }

  // --- Sprints ---

  async getSprints(): Promise<Sprint[]> {
    const db = await this.load();
    return db.sprints;
  }

  async addSprint(sprint: Sprint): Promise<void> {
    const db = await this.load();
    db.sprints.push(sprint);
    await this.save(db);
  }

  // --- Releases ---

  async getReleases(): Promise<Release[]> {
    const db = await this.load();
    return db.releases;
  }

  async addRelease(release: Release): Promise<void> {
    const db = await this.load();
    db.releases.push(release);
    await this.save(db);
  }

  // --- Audit Logs ---

  async addAuditLog(entry: AuditLogEntry): Promise<void> {
    const db = await this.load();
    db.auditLogs.push(entry);
    await this.save(db);
  }

  async getAuditLogsForTask(taskId: string): Promise<AuditLogEntry[]> {
    const db = await this.load();
    return db.auditLogs
      .filter((log) => log.taskId === taskId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Wiki ---

  async getWikiPages(): Promise<WikiPage[]> {
    const db = await this.load();
    return db.wikiPages;
  }

  async getWikiPageBySlug(slug: string): Promise<WikiPage | undefined> {
    const db = await this.load();
    return db.wikiPages.find((p) => p.slug === slug);
  }

  async saveWikiPage(page: WikiPage): Promise<void> {
    const db = await this.load();
    const index = db.wikiPages.findIndex((p) => p.slug === page.slug);
    if (index !== -1) {
      db.wikiPages[index] = page;
    } else {
      db.wikiPages.push(page);
    }
    await this.save(db);
  }

  // --- Discussions ---

  async getDiscussions(): Promise<Discussion[]> {
    const db = await this.load();
    return db.discussions;
  }

  async getDiscussionById(id: string): Promise<Discussion | undefined> {
    const db = await this.load();
    return db.discussions.find((d) => d.id === id);
  }

  async saveDiscussion(discussion: Discussion): Promise<void> {
    const db = await this.load();
    const index = db.discussions.findIndex((d) => d.id === discussion.id);
    if (index !== -1) {
      db.discussions[index] = discussion;
    } else {
      db.discussions.push(discussion);
    }
    await this.save(db);
  }
}

export const db = new Database();
