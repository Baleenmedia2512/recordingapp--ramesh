import { supabase, handleSupabaseError } from './supabase';
import { CallLog, DashboardFilters } from '@/types';

export const callLogApi = {
  // Fetch call logs with optional filters
  async fetchCallLogs(filters?: DashboardFilters): Promise<CallLog[]> {
    try {
      let query = supabase
        .from('call_logs')
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
      return data || [];
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Create a new call log
  async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at' | 'updated_at'>): Promise<CallLog> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .insert([callLog])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating call log:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update call log
  async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating call log:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete call log
  async deleteCallLog(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_logs')
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
      const { data, error } = await supabase
        .from('call_logs')
        .upsert(callLogs, { onConflict: 'device_id,timestamp' })
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error syncing call logs:', error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get call log by ID
  async getCallLogById(id: string): Promise<CallLog | null> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching call log:', error);
      return null;
    }
  },
};
