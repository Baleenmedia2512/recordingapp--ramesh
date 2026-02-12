import { supabase, handleSupabaseError } from './supabase';
import { CallLog, DashboardFilters } from '@/types';

// No field mapping needed - call_recordings table matches our TypeScript types exactly
function mapFromDB(dbRecord: any): CallLog {
  return dbRecord;
}

function mapToDB(appRecord: Partial<CallLog>): any {
  return appRecord;
}

export const callLogApi = {
  // Fetch call logs with optional filters
  async fetchCallLogs(filters?: DashboardFilters): Promise<CallLog[]> {
    try {
      let query = supabase
        .from('call_recordings')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.callType && filters.callType !== 'all') {
        query = query.eq('call_type', filters.callType);
      }

      if (filters?.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('timestamp', filters.dateTo);
      }

      if (filters?.searchQuery) {
        query = query.or(
          `phone_number.ilike.%${filters.searchQuery}%,contact_name.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters?.hasRecording !== undefined) {
        query = query.eq('has_recording', filters.hasRecording);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapFromDB);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Create a new call log
  async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at' | 'updated_at'>): Promise<CallLog> {
    try {
      const dbRecord = mapToDB(callLog);
      const { data, error } = await supabase
        .from('call_recordings')
        .insert([dbRecord])
        .select()
        .single();

      if (error) throw error;
      return mapFromDB(data);
    } catch (error) {
      console.error('Error creating call log:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update call log (with upsert fallback if row doesn't exist)
  async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog> {
    try {
      const dbUpdates = mapToDB(updates);
      
      // Check if ID is a UUID (from database) or temp/native ID
      const isUUID = id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isUUID) {
        // Try update with UUID
        const { data: updateData, error: updateError } = await supabase
          .from('call_recordings')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (updateData) {
          return mapFromDB(updateData);
        }
        
        // If UUID search failed and no recording_url, throw error
        if (!updates.recording_url) {
          if (updateError) throw updateError;
          throw new Error('Call log not found and insufficient data to insert');
        }
      }

      // If not UUID or row doesn't exist, use unique constraint (device_id, timestamp, phone_number)
      console.log('⚠️ Using upsert with unique constraint (device_id, timestamp, phone_number)...');
      
      // Prepare full data for upsert
      const fullData = {
        ...updates,
        native_call_id: updates.native_call_id || id, // Store original ID
        // Defaults for required fields (user_id will use database default auth.uid())
        phone_number: updates.phone_number || 'unknown',
        call_type: updates.call_type || 'missed',
        timestamp: updates.timestamp || new Date().toISOString(),
        duration: updates.duration || 0,
        device_id: updates.device_id || 'current-device',
        device_platform: updates.device_platform || 'android',
      };

      // Only include user_id if it's a valid UUID
      if (updates.user_id && updates.user_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        fullData.user_id = updates.user_id;
      }
      // Otherwise, let the database default auth.uid() handle it

      // Upsert using unique constraint, not id
      const { data: upsertData, error: upsertError } = await supabase
        .from('call_recordings')
        .upsert(mapToDB(fullData as CallLog), { 
          onConflict: 'device_id,timestamp,phone_number',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      return mapFromDB(upsertData);
      
    } catch (error) {
      console.error('Error updating call log:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete call log
  async deleteCallLog(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting call log:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Sync unsynced call logs
  async syncCallLogs(callLogs: Omit<CallLog, 'id' | 'created_at' | 'updated_at'>[]): Promise<CallLog[]> {
    try {
      const dbRecords = callLogs.map(mapToDB);
      const { data, error } = await supabase
        .from('call_recordings')
        .upsert(dbRecords, { onConflict: 'device_id,timestamp,phone_number' })
        .select();

      if (error) throw error;
      return (data || []).map(mapFromDB);
    } catch (error) {
      console.error('Error syncing call logs:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get call log by ID
  async getCallLogById(id: string): Promise<CallLog | null> {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? mapFromDB(data) : null;
    } catch (error) {
      console.error('Error fetching call log:', error);
      return null;
    }
  },
};
