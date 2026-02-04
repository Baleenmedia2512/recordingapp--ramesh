import { query } from './db';
import { CallLog, DashboardFilters } from '@/types';

// Fetch call logs with filters
export async function fetchCallLogs(
  userId: string,
  filters?: DashboardFilters
): Promise<CallLog[]> {
  let sql = `
    SELECT 
      cl.*,
      d.platform as device_platform
    FROM call_logs cl
    JOIN devices d ON cl.device_id = d.id
    WHERE cl.user_id = ?
  `;
  
  const params: any[] = [userId];

  // Apply filters
  if (filters?.searchQuery) {
    sql += ` AND (cl.phone_number LIKE ? OR cl.contact_name LIKE ?)`;
    params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
  }

  if (filters?.callType && filters.callType !== 'all') {
    sql += ` AND cl.call_type = ?`;
    params.push(filters.callType);
  }

  if (filters?.dateFrom) {
    sql += ` AND cl.timestamp >= ?`;
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    sql += ` AND cl.timestamp <= ?`;
    params.push(filters.dateTo);
  }

  if (filters?.hasRecording !== undefined) {
    sql += ` AND cl.has_recording = ?`;
    params.push(filters.hasRecording);
  }

  // Sort by timestamp descending
  sql += ` ORDER BY cl.timestamp DESC LIMIT 1000`;

  const logs = await query<any[]>(sql, params);
  
  return logs;
}

// Get single call log
export async function getCallLog(
  userId: string,
  callLogId: string
): Promise<CallLog | null> {
  const logs = await query<any[]>(
    `SELECT cl.*, d.platform as device_platform
     FROM call_logs cl
     JOIN devices d ON cl.device_id = d.id
     WHERE cl.id = ? AND cl.user_id = ?`,
    [callLogId, userId]
  );

  return logs.length > 0 ? logs[0] : null;
}

// Create call log
export async function createCallLog(
  userId: string,
  deviceId: string,
  data: Partial<CallLog>
): Promise<CallLog> {
  const result = await query<any>(
    `INSERT INTO call_logs 
     (user_id, device_id, phone_number, contact_name, call_type, timestamp, duration, has_recording, device_platform)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      deviceId,
      data.phone_number,
      data.contact_name || null,
      data.call_type,
      data.timestamp,
      data.duration || 0,
      data.has_recording || false,
      data.device_platform,
    ]
  );

  const insertId = result.insertId;
  const logs = await query<any[]>('SELECT * FROM call_logs WHERE id = ?', [insertId]);
  
  return logs[0];
}

// Update call log
export async function updateCallLog(
  userId: string,
  callLogId: string,
  data: Partial<CallLog>
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.recording_url !== undefined) {
    updates.push('recording_url = ?');
    params.push(data.recording_url);
    updates.push('has_recording = TRUE');
  }

  if (data.is_synced !== undefined) {
    updates.push('is_synced = ?');
    params.push(data.is_synced);
  }

  if (updates.length > 0) {
    params.push(callLogId, userId);
    await query(
      `UPDATE call_logs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
  }
}

// Delete call log
export async function deleteCallLog(
  userId: string,
  callLogId: string
): Promise<void> {
  await query(
    'DELETE FROM call_logs WHERE id = ? AND user_id = ?',
    [callLogId, userId]
  );
}

// Get user devices
export async function getUserDevices(userId: string): Promise<any[]> {
  return await query<any[]>(
    'SELECT * FROM devices WHERE user_id = ? ORDER BY last_sync DESC',
    [userId]
  );
}
