export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          broker_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          broker_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          broker_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      balance_audits: {
        Row: {
          audit_date: string
          bank_account_id: string
          bank_balance: number
          broker_id: string
          created_at: string
          difference: number
          id: string
          is_matched: boolean
          notes: string | null
          system_balance: number
          updated_at: string
        }
        Insert: {
          audit_date: string
          bank_account_id: string
          bank_balance: number
          broker_id: string
          created_at?: string
          difference?: number
          id?: string
          is_matched?: boolean
          notes?: string | null
          system_balance: number
          updated_at?: string
        }
        Update: {
          audit_date?: string
          bank_account_id?: string
          bank_balance?: number
          broker_id?: string
          created_at?: string
          difference?: number
          id?: string
          is_matched?: boolean
          notes?: string | null
          system_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_audits_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_audits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          agency: string | null
          assigned_user_id: string | null
          balance: number | null
          bank_name: string | null
          broker_id: string
          color: string | null
          created_at: string
          id: string
          initial_balance: number | null
          is_default: boolean | null
          last_reconciled_balance: number | null
          last_reconciled_date: string | null
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          assigned_user_id?: string | null
          balance?: number | null
          bank_name?: string | null
          broker_id: string
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number | null
          is_default?: boolean | null
          last_reconciled_balance?: number | null
          last_reconciled_date?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          assigned_user_id?: string | null
          balance?: number | null
          bank_name?: string | null
          broker_id?: string
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number | null
          is_default?: boolean | null
          last_reconciled_balance?: number | null
          last_reconciled_date?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_entries: {
        Row: {
          amount: number
          bank_account_id: string
          broker_id: string
          created_at: string
          description: string
          entry_date: string
          id: string
          import_id: string | null
          imported_at: string
          is_credit: boolean
          is_reconciled: boolean | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          broker_id: string
          created_at?: string
          description: string
          entry_date: string
          id?: string
          import_id?: string | null
          imported_at?: string
          is_credit: boolean
          is_reconciled?: boolean | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          broker_id?: string
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          import_id?: string | null
          imported_at?: string
          is_credit?: boolean
          is_reconciled?: boolean | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          bank_account_id: string
          broker_id: string
          created_at: string
          entries_count: number
          file_name: string
          file_type: string
          id: string
          imported_at: string
        }
        Insert: {
          bank_account_id: string
          broker_id: string
          created_at?: string
          entries_count?: number
          file_name: string
          file_type: string
          id?: string
          imported_at?: string
        }
        Update: {
          bank_account_id?: string
          broker_id?: string
          created_at?: string
          entries_count?: number
          file_name?: string
          file_type?: string
          id?: string
          imported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          broker_id: string
          city: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          broker_id: string
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          broker_id?: string
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          assigned_user_id: string | null
          avatar_url: string | null
          broker_id: string
          categories: string[]
          city: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          email: string | null
          id: string
          legacy_company_id: string | null
          legacy_lead_id: string | null
          legacy_owner_id: string | null
          metadata: Json | null
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          assigned_user_id?: string | null
          avatar_url?: string | null
          broker_id: string
          categories?: string[]
          city?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          legacy_company_id?: string | null
          legacy_lead_id?: string | null
          legacy_owner_id?: string | null
          metadata?: Json | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          assigned_user_id?: string | null
          avatar_url?: string | null
          broker_id?: string
          categories?: string[]
          city?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          legacy_company_id?: string | null
          legacy_lead_id?: string | null
          legacy_owner_id?: string | null
          metadata?: Json | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          broker_id: string | null
          content: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          broker_id?: string | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          broker_id?: string | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_obligation_types: {
        Row: {
          broker_id: string
          created_at: string
          default_due_day: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          default_due_day?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          default_due_day?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_obligation_types_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          broker_id: string
          completed_at: string | null
          created_at: string
          deal_id: string
          description: string | null
          id: string
          scheduled_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          broker_id: string
          completed_at?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          broker_id?: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          broker_id: string
          changed_at: string
          deal_id: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
        }
        Insert: {
          broker_id: string
          changed_at?: string
          deal_id: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
        }
        Update: {
          broker_id?: string
          changed_at?: string
          deal_id?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          broker_id: string
          completed_at: string | null
          created_at: string
          deal_id: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          completed_at?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_user_id: string | null
          broker_id: string
          business_type: string | null
          contact_id: string | null
          created_at: string
          custom_stage_id: string | null
          estimated_commission: number | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          initial_task: string | null
          lead_id: string
          loss_reason: string | null
          notes: string | null
          priority: string | null
          probability: number | null
          property_id: string
          stage: Database["public"]["Enums"]["pipeline_stage"]
          temperature: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          broker_id: string
          business_type?: string | null
          contact_id?: string | null
          created_at?: string
          custom_stage_id?: string | null
          estimated_commission?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          initial_task?: string | null
          lead_id: string
          loss_reason?: string | null
          notes?: string | null
          priority?: string | null
          probability?: number | null
          property_id: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          broker_id?: string
          business_type?: string | null
          contact_id?: string | null
          created_at?: string
          custom_stage_id?: string | null
          estimated_commission?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          initial_task?: string | null
          lead_id?: string
          loss_reason?: string | null
          notes?: string | null
          priority?: string | null
          probability?: number | null
          property_id?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_custom_stage_id_fkey"
            columns: ["custom_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          fields: Json
          id: string
          is_active: boolean | null
          name: string
          template_content: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name: string
          template_content: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          template_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          broker_id: string
          created_at: string
          deal_id: string | null
          description: string | null
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          lead_id: string | null
          mime_type: string | null
          parent_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          broker_id: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          parent_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          broker_id?: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          parent_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      early_adopter_claims: {
        Row: {
          claimed_at: string | null
          id: string
          plan_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          plan_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          plan_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "early_adopter_claims_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_adopter_claims_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          broker_id: string
          category_group: string | null
          color: string | null
          created_at: string
          dre_type: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          category_group?: string | null
          color?: string | null
          created_at?: string
          dre_type?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          category_group?: string | null
          color?: string | null
          created_at?: string
          dre_type?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          assigned_user_id: string | null
          bank_account_id: string | null
          broker_id: string
          category_id: string | null
          competency_period: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string
          due_date: string | null
          group_id: string | null
          id: string
          is_reconciled: boolean | null
          lead_id: string | null
          notes: string | null
          obligation_type: string | null
          paid_date: string | null
          payment_method: string | null
          property_id: string | null
          receipt_path: string | null
          reconciled_at: string | null
          recurrence_info: Json | null
          reference: string | null
          status: string
          transaction_date: string
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          assigned_user_id?: string | null
          bank_account_id?: string | null
          broker_id: string
          category_id?: string | null
          competency_period?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          lead_id?: string | null
          notes?: string | null
          obligation_type?: string | null
          paid_date?: string | null
          payment_method?: string | null
          property_id?: string | null
          receipt_path?: string | null
          reconciled_at?: string | null
          recurrence_info?: Json | null
          reference?: string | null
          status?: string
          transaction_date?: string
          type: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_user_id?: string | null
          bank_account_id?: string | null
          broker_id?: string
          category_id?: string | null
          competency_period?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          lead_id?: string | null
          notes?: string | null
          obligation_type?: string | null
          paid_date?: string | null
          payment_method?: string | null
          property_id?: string | null
          receipt_path?: string | null
          reconciled_at?: string | null
          recurrence_info?: Json | null
          reference?: string | null
          status?: string
          transaction_date?: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          broker_id: string
          created_at: string | null
          filled_fields: Json
          id: string
          template_id: string | null
          template_name: string
        }
        Insert: {
          broker_id: string
          created_at?: string | null
          filled_fields?: Json
          id?: string
          template_id?: string | null
          template_name: string
        }
        Update: {
          broker_id?: string
          created_at?: string | null
          filled_fields?: Json
          id?: string
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          broker_id: string
          created_at: string
          file_name: string
          file_type: string
          id: string
          imported_at: string
          property_id: string
          units_imported: number
        }
        Insert: {
          broker_id: string
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          imported_at?: string
          property_id: string
          units_imported?: number
        }
        Update: {
          broker_id?: string
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          imported_at?: string
          property_id?: string
          units_imported?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_history_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          broker_id: string
          created_at: string
          encrypted_api_key: string | null
          encrypted_config: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          sync_status: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string
          encrypted_api_key?: string | null
          encrypted_config?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_status?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string
          encrypted_api_key?: string | null
          encrypted_config?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_status?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          broker_id: string
          budget_max: number | null
          budget_min: number | null
          campaign_name: string | null
          city: string | null
          company_id: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          gclid: string | null
          google_device: string | null
          google_keyword: string | null
          google_matchtype: string | null
          google_network: string | null
          id: string
          interest_type: string[] | null
          landing_page: string | null
          lead_type: string | null
          meta_ad_id: string | null
          meta_ad_name: string | null
          meta_adset_id: string | null
          meta_adset_name: string | null
          meta_campaign_id: string | null
          meta_placement: string | null
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          preferred_regions: string[] | null
          referrer_url: string | null
          state: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          address?: string | null
          broker_id: string
          budget_max?: number | null
          budget_min?: number | null
          campaign_name?: string | null
          city?: string | null
          company_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          gclid?: string | null
          google_device?: string | null
          google_keyword?: string | null
          google_matchtype?: string | null
          google_network?: string | null
          id?: string
          interest_type?: string[] | null
          landing_page?: string | null
          lead_type?: string | null
          meta_ad_id?: string | null
          meta_ad_name?: string | null
          meta_adset_id?: string | null
          meta_adset_name?: string | null
          meta_campaign_id?: string | null
          meta_placement?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          preferred_regions?: string[] | null
          referrer_url?: string | null
          state?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          address?: string | null
          broker_id?: string
          budget_max?: number | null
          budget_min?: number | null
          campaign_name?: string | null
          city?: string | null
          company_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          gclid?: string | null
          google_device?: string | null
          google_keyword?: string | null
          google_matchtype?: string | null
          google_network?: string | null
          id?: string
          interest_type?: string[] | null
          landing_page?: string | null
          lead_type?: string | null
          meta_ad_id?: string | null
          meta_ad_name?: string | null
          meta_adset_id?: string | null
          meta_adset_name?: string | null
          meta_campaign_id?: string | null
          meta_placement?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          preferred_regions?: string[] | null
          referrer_url?: string | null
          state?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_adjustments: {
        Row: {
          adjustment_date: string
          broker_id: string
          created_at: string
          id: string
          index_percentage: number
          index_used: string
          lease_id: string
          new_value: number
          notes: string | null
          previous_value: number
        }
        Insert: {
          adjustment_date: string
          broker_id: string
          created_at?: string
          id?: string
          index_percentage: number
          index_used: string
          lease_id: string
          new_value: number
          notes?: string | null
          previous_value: number
        }
        Update: {
          adjustment_date?: string
          broker_id?: string
          created_at?: string
          id?: string
          index_percentage?: number
          index_used?: string
          lease_id?: string
          new_value?: number
          notes?: string | null
          previous_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_adjustments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_adjustments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          adjustment_index: string | null
          admin_fee_percentage: number | null
          administration_fee_value: number | null
          billing_automation: Json | null
          billing_logs: Json | null
          broker_id: string
          cib: string | null
          contract_status: string | null
          created_at: string
          deposit_amount: number | null
          due_day: number
          end_date: string | null
          gross_rent_value: number | null
          guarantee_type: string | null
          guarantor_data: Json | null
          id: string
          is_dimob_deductible: boolean | null
          is_dimob_eligible: boolean | null
          metadata: Json | null
          next_adjustment_date: string | null
          notes: string | null
          owner_contact_id: string | null
          payment_info: Json | null
          rent_amount: number
          signature_status: string | null
          signed_contract_path: string | null
          start_date: string
          status: string
          tenant_contact_id: string
          termination_date: string | null
          termination_reason: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          adjustment_index?: string | null
          admin_fee_percentage?: number | null
          administration_fee_value?: number | null
          billing_automation?: Json | null
          billing_logs?: Json | null
          broker_id: string
          cib?: string | null
          contract_status?: string | null
          created_at?: string
          deposit_amount?: number | null
          due_day?: number
          end_date?: string | null
          gross_rent_value?: number | null
          guarantee_type?: string | null
          guarantor_data?: Json | null
          id?: string
          is_dimob_deductible?: boolean | null
          is_dimob_eligible?: boolean | null
          metadata?: Json | null
          next_adjustment_date?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          payment_info?: Json | null
          rent_amount?: number
          signature_status?: string | null
          signed_contract_path?: string | null
          start_date: string
          status?: string
          tenant_contact_id: string
          termination_date?: string | null
          termination_reason?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          adjustment_index?: string | null
          admin_fee_percentage?: number | null
          administration_fee_value?: number | null
          billing_automation?: Json | null
          billing_logs?: Json | null
          broker_id?: string
          cib?: string | null
          contract_status?: string | null
          created_at?: string
          deposit_amount?: number | null
          due_day?: number
          end_date?: string | null
          gross_rent_value?: number | null
          guarantee_type?: string | null
          guarantor_data?: Json | null
          id?: string
          is_dimob_deductible?: boolean | null
          is_dimob_eligible?: boolean | null
          metadata?: Json | null
          next_adjustment_date?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          payment_info?: Json | null
          rent_amount?: number
          signature_status?: string | null
          signed_contract_path?: string | null
          start_date?: string
          status?: string
          tenant_contact_id?: string
          termination_date?: string | null
          termination_reason?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          lead_email: string
          notification_type: string
          sent_at: string
          visit_id: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          lead_email: string
          notification_type: string
          sent_at?: string
          visit_id: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          lead_email?: string
          notification_type?: string
          sent_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          broker_id: string
          city: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          broker_id: string
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          broker_id?: string
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          broker_id: string
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_default: boolean | null
          is_lost_stage: boolean | null
          is_won_stage: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_connections: {
        Row: {
          api_url: string | null
          broker_id: string
          created_at: string
          encrypted_credentials: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          portal_name: string
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          broker_id: string
          created_at?: string
          encrypted_credentials?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          portal_name: string
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          broker_id?: string
          created_at?: string
          encrypted_credentials?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          portal_name?: string
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_connections_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_listings: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_updated_at: string | null
          leads_count: number | null
          listing_url: string | null
          portal_connection_id: string
          status: string | null
          unit_id: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_updated_at?: string | null
          leads_count?: number | null
          listing_url?: string | null
          portal_connection_id: string
          status?: string | null
          unit_id: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_updated_at?: string | null
          leads_count?: number | null
          listing_url?: string | null
          portal_connection_id?: string
          status?: string | null
          unit_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_listings_portal_connection_id_fkey"
            columns: ["portal_connection_id"]
            isOneToOne: false
            referencedRelation: "portal_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_listings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          creci_document_url: string | null
          dark_mode_preference: boolean | null
          dashboard_settings: Json | null
          email: string
          full_name: string
          glow_intensity: number | null
          id: string
          notification_sound_enabled: boolean | null
          notification_vibration_enabled: boolean | null
          phone: string | null
          pipeline_stage_order: Json | null
          push_subscription: Json | null
          subscription_plan: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          creci_document_url?: string | null
          dark_mode_preference?: boolean | null
          dashboard_settings?: Json | null
          email: string
          full_name: string
          glow_intensity?: number | null
          id: string
          notification_sound_enabled?: boolean | null
          notification_vibration_enabled?: boolean | null
          phone?: string | null
          pipeline_stage_order?: Json | null
          push_subscription?: Json | null
          subscription_plan?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          creci_document_url?: string | null
          dark_mode_preference?: boolean | null
          dashboard_settings?: Json | null
          email?: string
          full_name?: string
          glow_intensity?: number | null
          id?: string
          notification_sound_enabled?: boolean | null
          notification_vibration_enabled?: boolean | null
          phone?: string | null
          pipeline_stage_order?: Json | null
          push_subscription?: Json | null
          subscription_plan?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          broker_id: string
          builder_name: string | null
          cib: string | null
          city: string | null
          commission_rate: number | null
          construction_stage: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          gallery_images: string[] | null
          id: string
          image_url: string | null
          intent_type: string | null
          iptu_number: string | null
          is_occupied: boolean | null
          is_under_management: boolean | null
          lead_id: string | null
          market_value: number | null
          name: string
          number_of_towers: number | null
          postal_code: string | null
          registration_number: string | null
          rental_value: number | null
          security_features: string | null
          state: string | null
          sustainability_features: string | null
          technology_features: string | null
          total_land_area: number | null
          total_units: number | null
          total_units_count: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          broker_id: string
          builder_name?: string | null
          cib?: string | null
          city?: string | null
          commission_rate?: number | null
          construction_stage?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          intent_type?: string | null
          iptu_number?: string | null
          is_occupied?: boolean | null
          is_under_management?: boolean | null
          lead_id?: string | null
          market_value?: number | null
          name: string
          number_of_towers?: number | null
          postal_code?: string | null
          registration_number?: string | null
          rental_value?: number | null
          security_features?: string | null
          state?: string | null
          sustainability_features?: string | null
          technology_features?: string | null
          total_land_area?: number | null
          total_units?: number | null
          total_units_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          broker_id?: string
          builder_name?: string | null
          cib?: string | null
          city?: string | null
          commission_rate?: number | null
          construction_stage?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          intent_type?: string | null
          iptu_number?: string | null
          is_occupied?: boolean | null
          is_under_management?: boolean | null
          lead_id?: string | null
          market_value?: number | null
          name?: string
          number_of_towers?: number | null
          postal_code?: string | null
          registration_number?: string | null
          rental_value?: number | null
          security_features?: string | null
          state?: string | null
          sustainability_features?: string | null
          technology_features?: string | null
          total_land_area?: number | null
          total_units?: number | null
          total_units_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          broker_id: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          property_id: string
          title: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          property_id: string
          title: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          property_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          broker_id: string
          commission_rate: number
          commission_value: number
          created_at: string
          deal_id: string
          id: string
          lead_id: string
          property_id: string
          sale_date: string
          sale_value: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          commission_rate: number
          commission_value: number
          created_at?: string
          deal_id: string
          id?: string
          lead_id: string
          property_id: string
          sale_date?: string
          sale_value: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          commission_rate?: number
          commission_value?: number
          created_at?: string
          deal_id?: string
          id?: string
          lead_id?: string
          property_id?: string
          sale_date?: string
          sale_value?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_activities: {
        Row: {
          activity_type: string
          broker_id: string
          completed_at: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_completed: boolean | null
          lead_id: string | null
          property_id: string | null
          scheduled_at: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          broker_id: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          property_id?: string | null
          scheduled_at: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          broker_id?: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          property_id?: string | null
          scheduled_at?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_activities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          early_adopter_limit: number | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price_anchor: number | null
          price_early_adopter: number | null
          price_original: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          early_adopter_limit?: number | null
          features: Json
          id: string
          is_active?: boolean | null
          name: string
          price_anchor?: number | null
          price_early_adopter?: number | null
          price_original?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          early_adopter_limit?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price_anchor?: number | null
          price_early_adopter?: number | null
          price_original?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_early_adopter: boolean | null
          plan_id: string
          price_locked: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_early_adopter?: boolean | null
          plan_id?: string
          price_locked?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_early_adopter?: boolean | null
          plan_id?: string
          price_locked?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          published_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      training_content: {
        Row: {
          category: string | null
          content_type: string
          created_at: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      training_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          created_at: string
          id: string
          is_completed: boolean | null
          progress_percent: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          is_completed?: boolean | null
          progress_percent?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean | null
          progress_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          area: number | null
          assigned_user_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          broker_id: string
          cib: string | null
          city: string | null
          condition: string | null
          condo_fee: number | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          furnished: string | null
          gallery_images: string[] | null
          has_no_registration: boolean | null
          id: string
          intent_type: string | null
          iptu: number | null
          iptu_number: string | null
          is_financeable: boolean | null
          is_managed: boolean | null
          is_occupied: boolean | null
          is_standalone: boolean | null
          lead_id: string | null
          market_value: number | null
          neighborhood: string | null
          obligations_config: Json | null
          owner_contact_id: string | null
          owner_id: string | null
          parking_spots: number | null
          postal_code: string | null
          price: number | null
          property_id: string | null
          property_type: string | null
          registration_number: string | null
          rent_price: number | null
          solar_orientation: string | null
          state: string | null
          status: Database["public"]["Enums"]["unit_status"]
          suites: number | null
          tags: string[] | null
          tenant_contact_id: string | null
          tenant_id: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: number | null
          assigned_user_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          broker_id: string
          cib?: string | null
          city?: string | null
          condition?: string | null
          condo_fee?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          furnished?: string | null
          gallery_images?: string[] | null
          has_no_registration?: boolean | null
          id?: string
          intent_type?: string | null
          iptu?: number | null
          iptu_number?: string | null
          is_financeable?: boolean | null
          is_managed?: boolean | null
          is_occupied?: boolean | null
          is_standalone?: boolean | null
          lead_id?: string | null
          market_value?: number | null
          neighborhood?: string | null
          obligations_config?: Json | null
          owner_contact_id?: string | null
          owner_id?: string | null
          parking_spots?: number | null
          postal_code?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          registration_number?: string | null
          rent_price?: number | null
          solar_orientation?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          suites?: number | null
          tags?: string[] | null
          tenant_contact_id?: string | null
          tenant_id?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: number | null
          assigned_user_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          broker_id?: string
          cib?: string | null
          city?: string | null
          condition?: string | null
          condo_fee?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          furnished?: string | null
          gallery_images?: string[] | null
          has_no_registration?: boolean | null
          id?: string
          intent_type?: string | null
          iptu?: number | null
          iptu_number?: string | null
          is_financeable?: boolean | null
          is_managed?: boolean | null
          is_occupied?: boolean | null
          is_standalone?: boolean | null
          lead_id?: string | null
          market_value?: number | null
          neighborhood?: string | null
          obligations_config?: Json | null
          owner_contact_id?: string | null
          owner_id?: string | null
          parking_spots?: number | null
          postal_code?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          registration_number?: string | null
          rent_price?: number | null
          solar_orientation?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          suites?: number | null
          tags?: string[] | null
          tenant_contact_id?: string | null
          tenant_id?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          broker_id: string
          created_at: string
          duration_minutes: number
          id: string
          lead_confirmed: boolean
          lead_confirmed_at: string | null
          lead_id: string
          notes: string | null
          notification_24h_sent: boolean
          notification_2h_sent: boolean
          property_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          lead_confirmed?: boolean
          lead_confirmed_at?: string | null
          lead_id: string
          notes?: string | null
          notification_24h_sent?: boolean
          notification_2h_sent?: boolean
          property_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          lead_confirmed?: boolean
          lead_confirmed_at?: string | null
          lead_id?: string
          notes?: string | null
          notification_24h_sent?: boolean
          notification_2h_sent?: boolean
          property_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          broker_id: string
          connected_at: string | null
          created_at: string
          evolution_api_url: string
          id: string
          instance_name: string
          phone_number: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          broker_id: string
          connected_at?: string | null
          created_at?: string
          evolution_api_url: string
          id?: string
          instance_name: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          broker_id?: string
          connected_at?: string | null
          created_at?: string
          evolution_api_url?: string
          id?: string
          instance_name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          connection_id: string
          contact_name: string | null
          contact_phone: string
          contact_profile_pic: string | null
          created_at: string
          id: string
          is_archived: boolean
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          remote_jid: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          connection_id: string
          contact_name?: string | null
          contact_phone: string
          contact_profile_pic?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          remote_jid: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          connection_id?: string
          contact_name?: string | null
          contact_phone?: string
          contact_profile_pic?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          remote_jid?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["whatsapp_message_direction"]
          id: string
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_id: string
          message_type: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at: string | null
          sent_at: string
          status: Database["public"]["Enums"]["whatsapp_message_status"]
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["whatsapp_message_direction"]
          id?: string
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id: string
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"]
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["whatsapp_message_direction"]
          id?: string
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_limit: {
        Args: {
          p_current_count?: number
          p_resource: string
          p_user_id: string
        }
        Returns: Json
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_early_adopter_count: { Args: { p_plan_id: string }; Returns: number }
      get_early_adopter_remaining_slots: {
        Args: { p_plan_id: string }
        Returns: number
      }
      get_user_plan_features: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      pipeline_stage:
        | "new_lead"
        | "in_contact"
        | "visit_scheduled"
        | "proposal"
        | "lost"
        | "won"
      unit_status: "available" | "reserved" | "rented" | "sold"
      visit_status: "scheduled" | "confirmed" | "cancelled" | "completed"
      whatsapp_connection_status:
        | "pending"
        | "connecting"
        | "connected"
        | "disconnected"
      whatsapp_message_direction: "incoming" | "outgoing"
      whatsapp_message_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      whatsapp_message_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "sticker"
        | "location"
        | "contact"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      pipeline_stage: [
        "new_lead",
        "in_contact",
        "visit_scheduled",
        "proposal",
        "lost",
        "won",
      ],
      unit_status: ["available", "reserved", "rented", "sold"],
      visit_status: ["scheduled", "confirmed", "cancelled", "completed"],
      whatsapp_connection_status: [
        "pending",
        "connecting",
        "connected",
        "disconnected",
      ],
      whatsapp_message_direction: ["incoming", "outgoing"],
      whatsapp_message_status: [
        "pending",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      whatsapp_message_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "sticker",
        "location",
        "contact",
      ],
    },
  },
} as const
