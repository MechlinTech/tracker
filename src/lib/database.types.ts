export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant'
          manager_id: string | null
          team: string
          force_password_change: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant'
          manager_id?: string | null
          team: string
          force_password_change?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant'
          manager_id?: string | null
          team?: string
          force_password_change?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employee_managers: {
        Row: {
          id: string
          employee_id: string
          manager_id: string
          manager_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          manager_id: string
          manager_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          manager_id?: string
          manager_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string | null
          duration: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          duration?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      screenshots: {
        Row: {
          id: string
          time_entry_id: string
          storage_path: string
          taken_at: string
          type: 'screen' | 'webcam'
          created_at: string
        }
        Insert: {
          id?: string
          time_entry_id: string
          storage_path: string
          taken_at: string
          type: 'screen' | 'webcam'
          created_at?: string
        }
        Update: {
          id?: string
          time_entry_id?: string
          storage_path?: string
          taken_at?: string
          type?: 'screen' | 'webcam'
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          screenshot_id: string
          window_title: string
          process_name: string
          created_at: string
        }
        Insert: {
          id?: string
          screenshot_id: string
          window_title: string
          process_name: string
          created_at?: string
        }
        Update: {
          id?: string
          screenshot_id?: string
          window_title?: string
          process_name?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 