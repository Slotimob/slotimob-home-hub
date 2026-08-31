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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_review_cycles: {
        Row: {
          broker_id: string
          completed_at: string | null
          completed_by: string | null
          completion_snapshot: Json | null
          created_at: string
          due_date: string
          id: string
          members_count: number
          members_snapshot: Json
          notes: string | null
          period_label: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_snapshot?: Json | null
          created_at?: string
          due_date: string
          id?: string
          members_count?: number
          members_snapshot?: Json
          notes?: string | null
          period_label: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_snapshot?: Json | null
          created_at?: string
          due_date?: string
          id?: string
          members_count?: number
          members_snapshot?: Json
          notes?: string | null
          period_label?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      account_deletion_logs: {
        Row: {
          accepted_at: string
          created_at: string
          deletion_reason: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          plan_id: string | null
          user_agent: string | null
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          deletion_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          plan_id?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          accepted_at?: string
          created_at?: string
          deletion_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          plan_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      admin_actions_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      ai_credit_packs: {
        Row: {
          asaas_price_reference: string | null
          created_at: string
          credits_amount: number
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          stripe_price_id: string
          stripe_product_id: string | null
        }
        Insert: {
          asaas_price_reference?: string | null
          created_at?: string
          credits_amount: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          stripe_price_id: string
          stripe_product_id?: string | null
        }
        Update: {
          asaas_price_reference?: string | null
          created_at?: string
          credits_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          stripe_price_id?: string
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          broker_id: string
          created_at: string
          credits_purchased: number
          credits_remaining: number
          expires_at: string | null
          id: string
          price_paid: number
          purchased_at: string
          stripe_payment_id: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string
          credits_purchased: number
          credits_remaining: number
          expires_at?: string | null
          id?: string
          price_paid: number
          purchased_at?: string
          stripe_payment_id?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string
          credits_purchased?: number
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          price_paid?: number
          purchased_at?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_credits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_credits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action_type: string
          consumed_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          expires_at: string
          id: string
          item_count: number
          justification: string | null
          organization_owner_id: string
          parameters: Json | null
          requested_by: string
          status: string
          target_ids: string[] | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          consumed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expires_at?: string
          id?: string
          item_count: number
          justification?: string | null
          organization_owner_id: string
          parameters?: Json | null
          requested_by: string
          status?: string
          target_ids?: string[] | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          consumed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expires_at?: string
          id?: string
          item_count?: number
          justification?: string | null
          organization_owner_id?: string
          parameters?: Json | null
          requested_by?: string
          status?: string
          target_ids?: string[] | null
          target_table?: string | null
        }
        Relationships: []
      }
      approval_thresholds: {
        Row: {
          action_type: string
          approval_validity_hours: number
          created_at: string
          enabled: boolean
          id: string
          organization_owner_id: string
          threshold: number
          updated_at: string
        }
        Insert: {
          action_type: string
          approval_validity_hours?: number
          created_at?: string
          enabled?: boolean
          id?: string
          organization_owner_id: string
          threshold: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          approval_validity_hours?: number
          created_at?: string
          enabled?: boolean
          id?: string
          organization_owner_id?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      asaas_accounts: {
        Row: {
          asaas_account_id: string
          asaas_api_key_encrypted: string | null
          broker_id: string
          cpf_cnpj: string | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          wallet_id: string | null
          webhook_registered_at: string | null
          webhook_token: string
        }
        Insert: {
          asaas_account_id: string
          asaas_api_key_encrypted?: string | null
          broker_id: string
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          wallet_id?: string | null
          webhook_registered_at?: string | null
          webhook_token?: string
        }
        Update: {
          asaas_account_id?: string
          asaas_api_key_encrypted?: string | null
          broker_id?: string
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          wallet_id?: string | null
          webhook_registered_at?: string | null
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_accounts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: true
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_accounts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_addon_subscriptions: {
        Row: {
          addon_id: string
          asaas_subscription_id: string
          broker_id: string
          created_at: string | null
          id: string
          quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          addon_id: string
          asaas_subscription_id: string
          broker_id: string
          created_at?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          addon_id?: string
          asaas_subscription_id?: string
          broker_id?: string
          created_at?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_addon_subscriptions_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "subscription_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_addon_subscriptions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_addon_subscriptions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          broker_id: string
          contact_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          asaas_customer_id: string
          broker_id: string
          contact_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          asaas_customer_id?: string
          broker_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_customers_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_customers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_payments: {
        Row: {
          asaas_payment_id: string
          asaas_subscription_id: string | null
          bank_slip_url: string | null
          billing_type: string
          broker_id: string
          created_at: string | null
          due_date: string
          financial_transaction_id: string | null
          id: string
          invoice_url: string | null
          lease_id: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          status: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_payment_id: string
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type: string
          broker_id: string
          created_at?: string | null
          due_date: string
          financial_transaction_id?: string | null
          id?: string
          invoice_url?: string | null
          lease_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_payment_id?: string
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string
          broker_id?: string
          created_at?: string | null
          due_date?: string
          financial_transaction_id?: string | null
          id?: string
          invoice_url?: string | null
          lease_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_improvements: {
        Row: {
          affects_market_value: boolean
          asset_type: string
          broker_id: string
          completed_at: string
          cost: number
          created_at: string
          description: string
          financial_transaction_id: string | null
          id: string
          improvement_type: string
          invoice_doc_path: string | null
          property_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          affects_market_value?: boolean
          asset_type: string
          broker_id: string
          completed_at: string
          cost: number
          created_at?: string
          description: string
          financial_transaction_id?: string | null
          id?: string
          improvement_type: string
          invoice_doc_path?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          affects_market_value?: boolean
          asset_type?: string
          broker_id?: string
          completed_at?: string
          cost?: number
          created_at?: string
          description?: string
          financial_transaction_id?: string | null
          id?: string
          improvement_type?: string
          invoice_doc_path?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_improvements_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_improvements_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_improvements_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_improvements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_improvements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_06: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_07: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_08: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_09: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_2026_10: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_default: {
        Row: {
          action: string | null
          actor_user_id: string | null
          broker_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor_user_id?: string | null
          broker_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs_legacy: {
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
            referencedRelation: "profile_directory"
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          fitid: string | null
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
          fitid?: string | null
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
          fitid?: string | null
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
            referencedRelation: "profile_directory"
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
            referencedRelation: "profile_directory"
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
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          ai_summary: string | null
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          faqs: Json | null
          featured_image: string | null
          featured_image_alt: string | null
          geo_location: string | null
          id: string
          is_published: boolean
          published_at: string | null
          reading_time_min: number | null
          seo_tags: Json | null
          slug: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          ai_summary?: string | null
          author_id: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
          featured_image?: string | null
          featured_image_alt?: string | null
          geo_location?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          reading_time_min?: number | null
          seo_tags?: Json | null
          slug: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          ai_summary?: string | null
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          faqs?: Json | null
          featured_image?: string | null
          featured_image_alt?: string | null
          geo_location?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          reading_time_min?: number | null
          seo_tags?: Json | null
          slug?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          broker_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          broker_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          broker_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_broker_id_fkey"
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          accepted_at: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          terms_version: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_logs_user_id_fkey"
            columns: ["user_id"]
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_charges: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_type: string
          broker_id: string
          created_at: string
          description: string | null
          discount_days: number
          discount_value: number
          fine_percentage: number
          id: string
          interest_percentage: number
          is_active: boolean
          lease_id: string
          metadata: Json | null
          send_email: boolean
          send_whatsapp: boolean
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          broker_id: string
          created_at?: string
          description?: string | null
          discount_days?: number
          discount_value?: number
          fine_percentage?: number
          id?: string
          interest_percentage?: number
          is_active?: boolean
          lease_id: string
          metadata?: Json | null
          send_email?: boolean
          send_whatsapp?: boolean
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          broker_id?: string
          created_at?: string
          description?: string | null
          discount_days?: number
          discount_value?: number
          fine_percentage?: number
          id?: string
          interest_percentage?: number
          is_active?: boolean
          lease_id?: string
          metadata?: Json | null
          send_email?: boolean
          send_whatsapp?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_obligation_types_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pipelines: {
        Row: {
          broker_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          pipeline_key: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          pipeline_key: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          pipeline_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_pipelines_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_pipelines_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          admin_note: string | null
          delivered_at: string | null
          delivered_by: string | null
          delivery_file_path: string | null
          delivery_file_size: number | null
          download_count: number
          expected_by: string
          expires_at: string | null
          handled_by: string | null
          id: string
          internal_note: string | null
          last_downloaded_at: string | null
          organization_owner_id: string
          reason: string
          request_note: string | null
          requested_at: string
          requested_by: string
          started_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_file_path?: string | null
          delivery_file_size?: number | null
          download_count?: number
          expected_by?: string
          expires_at?: string | null
          handled_by?: string | null
          id?: string
          internal_note?: string | null
          last_downloaded_at?: string | null
          organization_owner_id: string
          reason: string
          request_note?: string | null
          requested_at?: string
          requested_by: string
          started_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_file_path?: string | null
          delivery_file_size?: number | null
          download_count?: number
          expected_by?: string
          expires_at?: string | null
          handled_by?: string | null
          id?: string
          internal_note?: string | null
          last_downloaded_at?: string | null
          organization_owner_id?: string
          reason?: string
          request_note?: string | null
          requested_at?: string
          requested_by?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
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
          pipeline_type: string
          priority: string | null
          probability: number | null
          property_id: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          temperature: string | null
          title: string | null
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
          pipeline_type?: string
          priority?: string | null
          probability?: number | null
          property_id?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          title?: string | null
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
          pipeline_type?: string
          priority?: string | null
          probability?: number | null
          property_id?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          title?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          activity_id: string | null
          broker_id: string
          created_at: string
          deal_id: string | null
          description: string | null
          document_type: string
          external_provider: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          id: string
          lead_id: string | null
          mime_type: string | null
          parent_id: string | null
          property_id: string | null
          source_type: string
          title: string
          unit_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          activity_id?: string | null
          broker_id: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          document_type: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          parent_id?: string | null
          property_id?: string | null
          source_type?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          activity_id?: string | null
          broker_id?: string
          created_at?: string
          deal_id?: string | null
          description?: string | null
          document_type?: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          parent_id?: string | null
          property_id?: string | null
          source_type?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "property_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      email_notifications: {
        Row: {
          broker_id: string
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          resend_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          resend_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          resend_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          asset_expense_category: string | null
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
          whatsapp_sent_at: string | null
        }
        Insert: {
          amount: number
          asset_expense_category?: string | null
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
          whatsapp_sent_at?: string | null
        }
        Update: {
          amount?: number
          asset_expense_category?: string | null
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
          whatsapp_sent_at?: string | null
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
            referencedRelation: "profile_directory"
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          page_id: string | null
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
          page_id?: string | null
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
          page_id?: string | null
          sync_status?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          additional_obligations: Json
          adjustment_index: string | null
          adjustment_periodicity_months: number
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
          fire_insurance: Json | null
          gross_rent_value: number | null
          guarantee_type: string | null
          guarantor_data: Json | null
          id: string
          iptu_charge: Json | null
          is_dimob_deductible: boolean | null
          is_dimob_eligible: boolean | null
          is_indefinite_term: boolean
          metadata: Json | null
          needs_tenant_review: boolean
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
          tenant_review_note: string | null
          termination_date: string | null
          termination_reason: string | null
          unit_id: string
          unit_subdivision_id: string | null
          updated_at: string
        }
        Insert: {
          additional_obligations?: Json
          adjustment_index?: string | null
          adjustment_periodicity_months?: number
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
          fire_insurance?: Json | null
          gross_rent_value?: number | null
          guarantee_type?: string | null
          guarantor_data?: Json | null
          id?: string
          iptu_charge?: Json | null
          is_dimob_deductible?: boolean | null
          is_dimob_eligible?: boolean | null
          is_indefinite_term?: boolean
          metadata?: Json | null
          needs_tenant_review?: boolean
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
          tenant_review_note?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          unit_id: string
          unit_subdivision_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_obligations?: Json
          adjustment_index?: string | null
          adjustment_periodicity_months?: number
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
          fire_insurance?: Json | null
          gross_rent_value?: number | null
          guarantee_type?: string | null
          guarantor_data?: Json | null
          id?: string
          iptu_charge?: Json | null
          is_dimob_deductible?: boolean | null
          is_dimob_eligible?: boolean | null
          is_indefinite_term?: boolean
          metadata?: Json | null
          needs_tenant_review?: boolean
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
          tenant_review_note?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          unit_id?: string
          unit_subdivision_id?: string | null
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
          {
            foreignKeyName: "leases_unit_subdivision_id_fkey"
            columns: ["unit_subdivision_id"]
            isOneToOne: false
            referencedRelation: "unit_subdivisions"
            referencedColumns: ["id"]
          },
        ]
      }
      managerial_transactions: {
        Row: {
          amount: number
          broker_id: string
          competency_period: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          obligation_type: string | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          broker_id: string
          competency_period?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          obligation_type?: string | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          broker_id?: string
          competency_period?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          obligation_type?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managerial_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      market_value_history: {
        Row: {
          appraiser_name: string | null
          asset_type: string
          broker_id: string
          effective_date: string
          id: string
          note: string | null
          property_id: string | null
          recorded_at: string
          recorded_by: string | null
          source: string
          unit_id: string | null
          value: number
        }
        Insert: {
          appraiser_name?: string | null
          asset_type: string
          broker_id: string
          effective_date?: string
          id?: string
          note?: string | null
          property_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          unit_id?: string | null
          value: number
        }
        Update: {
          appraiser_name?: string | null
          asset_type?: string
          broker_id?: string
          effective_date?: string
          id?: string
          note?: string | null
          property_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source?: string
          unit_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_value_history_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_value_history_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_value_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_value_history_unit_id_fkey"
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
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_name: string | null
          organization_owner_id: string
          permissions: Json
          role_label: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_name?: string | null
          organization_owner_id: string
          permissions?: Json
          role_label?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_name?: string | null
          organization_owner_id?: string
          permissions?: Json
          role_label?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_owner_id_fkey"
            columns: ["organization_owner_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_owner_id_fkey"
            columns: ["organization_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          is_active: boolean
          organization_owner_id: string
          permissions: Json
          role_label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          is_active?: boolean
          organization_owner_id: string
          permissions?: Json
          role_label?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          is_active?: boolean
          organization_owner_id?: string
          permissions?: Json
          role_label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          pipeline_type: string
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
          pipeline_type?: string
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
          pipeline_type?: string
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          accepted_terms: boolean | null
          address_cep: string | null
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_street: string | null
          address_uf: string | null
          agency_id: string | null
          asaas_config: Json | null
          author_role: string | null
          avatar_url: string | null
          bio_mini: string | null
          business_name: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          creci_document_url: string | null
          dark_mode_preference: boolean | null
          dashboard_settings: Json | null
          email: string
          email_verified_at: string | null
          feed_token: string | null
          full_name: string
          glow_intensity: number | null
          ical_token: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          notification_sound_enabled: boolean | null
          notification_vibration_enabled: boolean | null
          person_type: string | null
          phone: string | null
          pipeline_stage_order: Json | null
          push_subscription: Json | null
          subscription_plan: string | null
          terms_accepted_at: string | null
          terms_signature: string | null
          terms_version: string | null
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          accepted_terms?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          address_uf?: string | null
          agency_id?: string | null
          asaas_config?: Json | null
          author_role?: string | null
          avatar_url?: string | null
          bio_mini?: string | null
          business_name?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          creci_document_url?: string | null
          dark_mode_preference?: boolean | null
          dashboard_settings?: Json | null
          email: string
          email_verified_at?: string | null
          feed_token?: string | null
          full_name: string
          glow_intensity?: number | null
          ical_token?: string | null
          id: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notification_sound_enabled?: boolean | null
          notification_vibration_enabled?: boolean | null
          person_type?: string | null
          phone?: string | null
          pipeline_stage_order?: Json | null
          push_subscription?: Json | null
          subscription_plan?: string | null
          terms_accepted_at?: string | null
          terms_signature?: string | null
          terms_version?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          accepted_terms?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_street?: string | null
          address_uf?: string | null
          agency_id?: string | null
          asaas_config?: Json | null
          author_role?: string | null
          avatar_url?: string | null
          bio_mini?: string | null
          business_name?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          creci_document_url?: string | null
          dark_mode_preference?: boolean | null
          dashboard_settings?: Json | null
          email?: string
          email_verified_at?: string | null
          feed_token?: string | null
          full_name?: string
          glow_intensity?: number | null
          ical_token?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notification_sound_enabled?: boolean | null
          notification_vibration_enabled?: boolean | null
          person_type?: string | null
          phone?: string | null
          pipeline_stage_order?: Json | null
          push_subscription?: Json | null
          subscription_plan?: string | null
          terms_accepted_at?: string | null
          terms_signature?: string | null
          terms_version?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          acquisition_costs: number | null
          acquisition_date: string | null
          acquisition_notes: string | null
          acquisition_value: number | null
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
          neighborhood: string | null
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
          acquisition_costs?: number | null
          acquisition_date?: string | null
          acquisition_notes?: string | null
          acquisition_value?: number | null
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
          neighborhood?: string | null
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
          acquisition_costs?: number | null
          acquisition_date?: string | null
          acquisition_notes?: string | null
          acquisition_value?: number | null
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
          neighborhood?: string | null
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
      property_activities: {
        Row: {
          activity_group_id: string | null
          activity_type: string
          assigned_contact_id: string | null
          broker_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          financial_transaction_id: string | null
          id: string
          is_completed: boolean
          metadata: Json | null
          outcome: string | null
          property_id: string | null
          responsible_name: string | null
          scheduled_at: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          activity_group_id?: string | null
          activity_type?: string
          assigned_contact_id?: string | null
          broker_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          financial_transaction_id?: string | null
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          outcome?: string | null
          property_id?: string | null
          responsible_name?: string | null
          scheduled_at?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_group_id?: string | null
          activity_type?: string
          assigned_contact_id?: string | null
          broker_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          financial_transaction_id?: string | null
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          outcome?: string | null
          property_id?: string | null
          responsible_name?: string | null
          scheduled_at?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_activities_assigned_contact_id_fkey"
            columns: ["assigned_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          broker_id: string
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          include_cover: boolean
          include_financing: boolean
          introduction_message: string | null
          lead_name: string | null
          pdf_url: string | null
          property_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          include_cover?: boolean
          include_financing?: boolean
          introduction_message?: string | null
          lead_name?: string | null
          pdf_url?: string | null
          property_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          include_cover?: boolean
          include_financing?: boolean
          introduction_message?: string | null
          lead_name?: string | null
          pdf_url?: string | null
          property_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_messages: {
        Row: {
          broker_id: string
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          broker_id: string
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          broker_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_messages_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_messages_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      role_templates: {
        Row: {
          broker_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
          assigned_user_id: string | null
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
          assigned_user_id?: string | null
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
          assigned_user_id?: string | null
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
            foreignKeyName: "schedule_activities_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
      subscription_addons: {
        Row: {
          addon_type: string
          applicable_plans: string[]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          quantity_per_addon: number
        }
        Insert: {
          addon_type: string
          applicable_plans?: string[]
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          price: number
          quantity_per_addon?: number
        }
        Update: {
          addon_type?: string
          applicable_plans?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          quantity_per_addon?: number
        }
        Relationships: []
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
          price_annual: number | null
          price_annual_early_adopter: number | null
          price_early_adopter: number | null
          price_original: number | null
          stripe_price_id_annual_early_adopter: string | null
          stripe_price_id_early_adopter: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
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
          price_annual?: number | null
          price_annual_early_adopter?: number | null
          price_early_adopter?: number | null
          price_original?: number | null
          stripe_price_id_annual_early_adopter?: string | null
          stripe_price_id_early_adopter?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
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
          price_annual?: number | null
          price_annual_early_adopter?: number | null
          price_early_adopter?: number | null
          price_original?: number | null
          stripe_price_id_annual_early_adopter?: string | null
          stripe_price_id_early_adopter?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          ai_credits_limit: number
          ai_credits_used: number
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_provider: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          extra_unit_packs: number
          extra_users_count: number
          id: string
          is_early_adopter: boolean | null
          last_modified_by_admin: string | null
          plan_id: string
          price_locked: number | null
          status: string
          stripe_addon_units_item_id: string | null
          stripe_addon_users_item_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_extension_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_credits_limit?: number
          ai_credits_used?: number
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_provider?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          extra_unit_packs?: number
          extra_users_count?: number
          id?: string
          is_early_adopter?: boolean | null
          last_modified_by_admin?: string | null
          plan_id?: string
          price_locked?: number | null
          status?: string
          stripe_addon_units_item_id?: string | null
          stripe_addon_users_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extension_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_credits_limit?: number
          ai_credits_used?: number
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_provider?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          extra_unit_packs?: number
          extra_users_count?: number
          id?: string
          is_early_adopter?: boolean | null
          last_modified_by_admin?: string | null
          plan_id?: string
          price_locked?: number | null
          status?: string
          stripe_addon_units_item_id?: string | null
          stripe_addon_users_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extension_count?: number
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
      support_debug_sessions: {
        Row: {
          ended_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          started_at: string
          started_by: string
          target_user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          started_at?: string
          started_by: string
          target_user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          started_at?: string
          started_by?: string
          target_user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
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
          body_markdown: string | null
          category: string | null
          checkout_url: string | null
          content_type: string
          created_at: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          feature_key: string | null
          id: string
          is_premium: boolean
          is_published: boolean | null
          price: number | null
          short_description: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          body_markdown?: string | null
          category?: string | null
          checkout_url?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          feature_key?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean | null
          price?: number | null
          short_description?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          body_markdown?: string | null
          category?: string | null
          checkout_url?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          feature_key?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean | null
          price?: number | null
          short_description?: string | null
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
            referencedRelation: "profile_directory"
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
      unit_subdivisions: {
        Row: {
          area: number | null
          broker_id: string
          created_at: string
          id: string
          label: string
          notes: string | null
          rent_price: number | null
          status: Database["public"]["Enums"]["unit_status"]
          tenant_contact_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          area?: number | null
          broker_id: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          rent_price?: number | null
          status?: Database["public"]["Enums"]["unit_status"]
          tenant_contact_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          area?: number | null
          broker_id?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          rent_price?: number | null
          status?: Database["public"]["Enums"]["unit_status"]
          tenant_contact_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_subdivisions_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_subdivisions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_tenant_history: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          lease_id: string | null
          moved_in_at: string
          moved_out_at: string | null
          notes: string | null
          source: string
          tenant_contact_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          lease_id?: string | null
          moved_in_at?: string
          moved_out_at?: string | null
          notes?: string | null
          source?: string
          tenant_contact_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          lease_id?: string | null
          moved_in_at?: string
          moved_out_at?: string | null
          notes?: string | null
          source?: string
          tenant_contact_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_tenant_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_tenant_history_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_tenant_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          acquisition_costs: number | null
          acquisition_date: string | null
          acquisition_notes: string | null
          acquisition_value: number | null
          address: string | null
          area: number | null
          area_total: number | null
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
          has_subdivisions: boolean
          id: string
          intent_type: string | null
          iptu: number | null
          iptu_number: string | null
          is_financeable: boolean | null
          is_managed: boolean | null
          is_occupied: boolean | null
          is_published_portal: boolean
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
          acquisition_costs?: number | null
          acquisition_date?: string | null
          acquisition_notes?: string | null
          acquisition_value?: number | null
          address?: string | null
          area?: number | null
          area_total?: number | null
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
          has_subdivisions?: boolean
          id?: string
          intent_type?: string | null
          iptu?: number | null
          iptu_number?: string | null
          is_financeable?: boolean | null
          is_managed?: boolean | null
          is_occupied?: boolean | null
          is_published_portal?: boolean
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
          acquisition_costs?: number | null
          acquisition_date?: string | null
          acquisition_notes?: string | null
          acquisition_value?: number | null
          address?: string | null
          area?: number | null
          area_total?: number | null
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
          has_subdivisions?: boolean
          id?: string
          intent_type?: string | null
          iptu?: number | null
          iptu_number?: string | null
          is_financeable?: boolean | null
          is_managed?: boolean | null
          is_occupied?: boolean | null
          is_published_portal?: boolean
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
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
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
      utm_links: {
        Row: {
          campanha: string
          canal: string
          conteudo: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          destino_url: string
          formato: string
          full_url: string
          id: string
        }
        Insert: {
          campanha: string
          canal: string
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          destino_url: string
          formato: string
          full_url: string
          id?: string
        }
        Update: {
          campanha?: string
          canal?: string
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          destino_url?: string
          formato?: string
          full_url?: string
          id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          assigned_user_id: string | null
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
          assigned_user_id?: string | null
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
          assigned_user_id?: string | null
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
            foreignKeyName: "visits_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          api_provider: string
          broker_id: string
          connected_at: string | null
          connection_status: string
          created_at: string
          evolution_api_url: string | null
          id: string
          instance_name: string | null
          phone_number: string | null
          phone_number_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at: string
          waba_id: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_provider?: string
          broker_id: string
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          evolution_api_url?: string | null
          id?: string
          instance_name?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          waba_id?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_provider?: string
          broker_id?: string
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          evolution_api_url?: string | null
          id?: string
          instance_name?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: Database["public"]["Enums"]["whatsapp_connection_status"]
          updated_at?: string
          waba_id?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_conversation_tags: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_tags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          connection_id: string
          contact_id: string | null
          contact_name: string | null
          contact_phone: string
          contact_profile_pic: string | null
          created_at: string
          deal_id: string | null
          id: string
          is_archived: boolean
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          remote_jid: string
          status: string
          tags: string[] | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          connection_id: string
          contact_id?: string | null
          contact_name?: string | null
          contact_phone: string
          contact_profile_pic?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          remote_jid: string
          status?: string
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          connection_id?: string
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          contact_profile_pic?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          remote_jid?: string
          status?: string
          tags?: string[] | null
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
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
      whatsapp_credit_packs: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          id: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      whatsapp_message_credits: {
        Row: {
          broker_id: string
          created_at: string
          credit_type: string
          credits_purchased: number
          credits_remaining: number
          expires_at: string | null
          id: string
          price_paid: number
          purchased_at: string
          stripe_payment_id: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string
          credit_type?: string
          credits_purchased: number
          credits_remaining: number
          expires_at?: string | null
          id?: string
          price_paid: number
          purchased_at?: string
          stripe_payment_id?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string
          credit_type?: string
          credits_purchased?: number
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          price_paid?: number
          purchased_at?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_credits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_credits_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_billing_event: boolean
          is_internal_note: boolean
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_id: string
          message_type: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at: string | null
          sender_user_id: string | null
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
          is_billing_event?: boolean
          is_internal_note?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id: string
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at?: string | null
          sender_user_id?: string | null
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
          is_billing_event?: boolean
          is_internal_note?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          read_at?: string | null
          sender_user_id?: string | null
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
      whatsapp_sync_jobs: {
        Row: {
          broker_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          processed_chats: number
          status: string
          total_chats: number
        }
        Insert: {
          broker_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          processed_chats?: number
          status?: string
          total_chats?: number
        }
        Update: {
          broker_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          processed_chats?: number
          status?: string
          total_chats?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sync_jobs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sync_jobs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_tags: {
        Row: {
          broker_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          broker_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          broker_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tags_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_tags_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_terms_acceptances: {
        Row: {
          accepted_at: string
          broker_id: string
          context: string | null
          id: string
          ip_address: string | null
          terms_version: string | null
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          broker_id: string
          context?: string | null
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          broker_id?: string
          context?: string | null
          id?: string
          ip_address?: string | null
          terms_version?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      whatsapp_usage_stats: {
        Row: {
          billing_events: number
          broker_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          service_conversations: number
          total_messages_received: number
          total_messages_sent: number
          updated_at: string
        }
        Insert: {
          billing_events?: number
          broker_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          service_conversations?: number
          total_messages_received?: number
          total_messages_sent?: number
          updated_at?: string
        }
        Update: {
          billing_events?: number
          broker_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          service_conversations?: number
          total_messages_received?: number
          total_messages_sent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_usage_stats_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_usage_stats_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profile_directory: {
        Row: {
          author_role: string | null
          avatar_url: string | null
          bio_mini: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          theme_preference: string | null
        }
        Insert: {
          author_role?: string | null
          avatar_url?: string | null
          bio_mini?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          theme_preference?: string | null
        }
        Update: {
          author_role?: string | null
          avatar_url?: string | null
          bio_mini?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          theme_preference?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_latest_terms: {
        Args: { p_terms_version: string }
        Returns: undefined
      }
      admin_add_credits: {
        Args: {
          p_amount: number
          p_credit_type: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_adjust_limits: {
        Args: {
          p_extra_unit_packs: number
          p_extra_users: number
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_change_plan: {
        Args: {
          p_new_plan_id: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_change_role: {
        Args: {
          p_action: string
          p_reason: string
          p_role: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_manage_trial: {
        Args: { p_new_trial_end: string; p_target_user_id: string }
        Returns: undefined
      }
      audit_diff: { Args: { new_row: Json; old_row: Json }; Returns: Json }
      can_access_whatsapp_connection: {
        Args: { _broker_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_whatsapp_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_edit_member_permissions: {
        Args: { p_editor: string; p_target: string }
        Returns: boolean
      }
      can_view_assigned_record: {
        Args: {
          _assigned_user_id: string
          _broker_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_audit_log: {
        Args: { p_broker_id: string; p_viewer_id: string }
        Returns: boolean
      }
      can_write_as_broker: {
        Args: { p_broker_id: string; p_user_id: string }
        Returns: boolean
      }
      check_member_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      check_user_limit: {
        Args: {
          p_current_count?: number
          p_resource: string
          p_user_id: string
        }
        Returns: Json
      }
      claim_early_adopter_slot: { Args: { p_plan_id: string }; Returns: Json }
      cleanup_expired_email_verifications: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      complete_access_review: {
        Args: { p_cycle_id: string; p_notes?: string }
        Returns: Json
      }
      consume_approval: { Args: { p_request_id: string }; Returns: boolean }
      current_access_review_period: {
        Args: { p_ref?: string }
        Returns: {
          due_date: string
          period_label: string
          period_start: string
        }[]
      }
      decrypt_asaas_api_key: { Args: { p_encrypted: string }; Returns: string }
      encrypt_asaas_api_key: { Args: { p_plain: string }; Returns: string }
      get_access_review_overview: { Args: never; Returns: Json }
      get_ai_credits_balance: { Args: { p_user_id: string }; Returns: Json }
      get_cockpit_organizations: { Args: never; Returns: Json }
      get_early_adopter_count: { Args: { p_plan_id: string }; Returns: number }
      get_early_adopter_remaining_slots: {
        Args: { p_plan_id: string }
        Returns: number
      }
      get_effective_broker_id: { Args: { p_user_id: string }; Returns: string }
      get_effective_limits: { Args: { p_user_id: string }; Returns: Json }
      get_invitation_by_token: { Args: { p_token: string }; Returns: Json }
      get_pending_access_review: { Args: never; Returns: Json }
      get_user_audit_logs: {
        Args: { p_limit?: number; p_target_user_id: string }
        Returns: Json
      }
      get_user_plan_features: { Args: { p_user_id: string }; Returns: Json }
      get_user_support_info: { Args: { p_search: string }; Returns: Json }
      get_user_trial_status: { Args: { p_user_id: string }; Returns: Json }
      get_whatsapp_monthly_usage: {
        Args: { p_broker_id: string }
        Returns: Json
      }
      get_workspace_user_ids: { Args: { p_user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_crm_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      maintain_audit_partitions: { Args: never; Returns: undefined }
      mark_overdue_access_reviews: { Args: never; Returns: Json }
      open_access_review_cycles: { Args: never; Returns: Json }
      realtime_topic_allowed: { Args: { p_topic: string }; Returns: boolean }
      regenerate_feed_token: { Args: { p_user_id: string }; Returns: string }
      regenerate_ical_token: { Args: { user_id: string }; Returns: string }
      register_export_download: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      register_tenant_history_entry: {
        Args: {
          p_lease_id?: string
          p_moved_in_at: string
          p_moved_out_at?: string
          p_notes?: string
          p_source?: string
          p_tenant_contact_id: string
          p_unit_id: string
        }
        Returns: string
      }
      reset_ai_credits_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_unit_tenant_from_lease: {
        Args: {
          p_lease_id: string
          p_start_date: string
          p_tenant_contact_id: string
          p_unit_id: string
        }
        Returns: undefined
      }
      validate_permissions_payload: {
        Args: { p_editor: string; p_new: Json; p_old: Json; p_target: string }
        Returns: boolean
      }
      verify_cron_secret: { Args: { p_secret: string }; Returns: boolean }
      verify_current_password: { Args: { password: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "agent"
        | "support"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "agent",
        "support",
      ],
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
