import { db } from '../db.js';
import { randomUUID } from 'crypto';

export class AuditService {
  static async logChange(taskId: string, field: string, oldValue: any, newValue: any, changedBy: string = 'Gemini') {
    // Don't log if values are identical
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

    await db.addAuditLog({
      id: randomUUID(),
      taskId,
      field,
      oldValue,
      newValue,
      changedBy,
      timestamp: new Date().toISOString()
    });
  }
}
