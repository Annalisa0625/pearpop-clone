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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_note: string | null
          admin_user_id: string
          after_value: string | null
          before_value: string | null
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          action_type: string
          admin_note?: string | null
          admin_user_id: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          action_type?: string
          admin_note?: string | null
          admin_user_id?: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: []
      }
      admin_request_meta: {
        Row: {
          admin_note: string | null
          admin_priority: number | null
          request_id: string
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          admin_priority?: number | null
          request_id: string
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          admin_priority?: number | null
          request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_request_meta_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          last_read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          company_user_id: string
          created_at: string
          creator_user_id: string
          id: string
          last_message_at: string | null
          order_id: string | null
          request_id: string | null
        }
        Insert: {
          company_user_id: string
          created_at?: string
          creator_user_id: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          request_id?: string | null
        }
        Update: {
          company_user_id?: string
          created_at?: string
          creator_user_id?: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          approval_status: string
          company_name: string | null
          contact_email: string | null
          created_at: string | null
          description: string | null
          id: string
          phone_number: string | null
          usage_purpose: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          approval_status?: string
          company_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phone_number?: string | null
          usage_purpose?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          approval_status?: string
          company_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          phone_number?: string | null
          usage_purpose?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      creator_menus: {
        Row: {
          account_url: string | null
          allow_secondary_use: boolean
          category: string | null
          created_at: string | null
          creator_id: string | null
          currency: string
          deliverables: string | null
          delivery_days: number | null
          description: string | null
          fulfillment_type: string
          id: string
          is_active: boolean | null
          menu_type: string | null
          notes: string | null
          platform: string | null
          price: number | null
          reference_price_text: string | null
          sns: string | null
          sort_order: number
          tags: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_url?: string | null
          allow_secondary_use?: boolean
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          currency?: string
          deliverables?: string | null
          delivery_days?: number | null
          description?: string | null
          fulfillment_type?: string
          id?: string
          is_active?: boolean | null
          menu_type?: string | null
          notes?: string | null
          platform?: string | null
          price?: number | null
          reference_price_text?: string | null
          sns?: string | null
          sort_order?: number
          tags?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_url?: string | null
          allow_secondary_use?: boolean
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          currency?: string
          deliverables?: string | null
          delivery_days?: number | null
          description?: string | null
          fulfillment_type?: string
          id?: string
          is_active?: boolean | null
          menu_type?: string | null
          notes?: string | null
          platform?: string | null
          price?: number | null
          reference_price_text?: string | null
          sns?: string | null
          sort_order?: number
          tags?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_payout_profiles: {
        Row: {
          account_holder_kana: string | null
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          admin_note: string | null
          bank_code: string | null
          bank_name: string | null
          branch_code: string | null
          branch_name: string | null
          created_at: string
          creator_id: string
          id: string
          payout_method: string
          rejected_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          account_holder_kana?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          admin_note?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id: string
          id?: string
          payout_method?: string
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          account_holder_kana?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          admin_note?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          payout_method?: string
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_profiles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_portfolio_assets: {
        Row: {
          asset_type: string
          asset_url: string
          created_at: string
          creator_id: string
          id: string
          is_public: boolean
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string
          asset_url: string
          created_at?: string
          creator_id: string
          id?: string
          is_public?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          asset_url?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_public?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_portfolio_assets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_social_accounts: {
        Row: {
          audience_country: string
          created_at: string
          creator_id: string
          follower_range: string
          handle: string | null
          id: string
          is_primary: boolean
          platform: string
          sort_order: number
          url: string
        }
        Insert: {
          audience_country: string
          created_at?: string
          creator_id: string
          follower_range: string
          handle?: string | null
          id?: string
          is_primary?: boolean
          platform: string
          sort_order?: number
          url: string
        }
        Update: {
          audience_country?: string
          created_at?: string
          creator_id?: string
          follower_range?: string
          handle?: string | null
          id?: string
          is_primary?: boolean
          platform?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_social_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          approval_status: string
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          can_receive_products: boolean
          category: string | null
          city: string | null
          contact_email: string | null
          content_language: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          display_name: string
          full_name: string | null
          gender: string | null
          id: string
          is_public: boolean
          is_suspended: boolean
          phone_country_code: string | null
          phone_number: string | null
          phone_verified_at: string | null
          prefecture: string | null
          rating: number | null
          response_language: string | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean
          sub_categories: string[]
          total_orders: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          can_receive_products?: boolean
          category?: string | null
          city?: string | null
          contact_email?: string | null
          content_language?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name: string
          full_name?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean
          is_suspended?: boolean
          phone_country_code?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          prefecture?: string | null
          rating?: number | null
          response_language?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          sub_categories?: string[]
          total_orders?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          can_receive_products?: boolean
          category?: string | null
          city?: string | null
          contact_email?: string | null
          content_language?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean
          is_suspended?: boolean
          phone_country_code?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          prefecture?: string | null
          rating?: number | null
          response_language?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          sub_categories?: string[]
          total_orders?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      danger_message_flags: {
        Row: {
          chat_id: string | null
          content: string | null
          created_at: string
          id: string
          matched_word: string | null
          message_id: string
          request_id: string | null
          sender_id: string | null
        }
        Insert: {
          chat_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          matched_word?: string | null
          message_id: string
          request_id?: string | null
          sender_id?: string | null
        }
        Update: {
          chat_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          matched_word?: string | null
          message_id?: string
          request_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      danger_message_logs: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          detected_words: string[]
          id: string
          message_id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          detected_words: string[]
          id?: string
          message_id: string
          request_id: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          detected_words?: string[]
          id?: string
          message_id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          sender_user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          sender_user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          error_message: string | null
          failed_at: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          notification_id: string
          provider: string | null
          provider_recipient_id: string | null
          recipient_user_id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          notification_id: string
          provider?: string | null
          provider_recipient_id?: string | null
          recipient_user_id: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          notification_id?: string
          provider?: string | null
          provider_recipient_id?: string | null
          recipient_user_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_external_accounts: {
        Row: {
          connected_at: string
          created_at: string
          disconnected_at: string | null
          id: string
          is_connected: boolean
          metadata: Json
          provider: string
          provider_display_name: string | null
          provider_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_connected?: boolean
          metadata?: Json
          provider: string
          provider_display_name?: string | null
          provider_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_connected?: boolean
          metadata?: Json
          provider?: string
          provider_display_name?: string | null
          provider_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          in_app_enabled: boolean
          line_enabled: boolean
          muted_types: string[]
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          line_enabled?: boolean
          muted_types?: string[]
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          line_enabled?: boolean
          muted_types?: string[]
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          archived_at: string | null
          body: string | null
          chat_id: string | null
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          importance: string
          link_path: string | null
          message_id: string | null
          metadata: Json
          notification_type: string
          order_id: string | null
          read_at: string | null
          recipient_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actor_user_id?: string | null
          archived_at?: string | null
          body?: string | null
          chat_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance?: string
          link_path?: string | null
          message_id?: string | null
          metadata?: Json
          notification_type: string
          order_id?: string | null
          read_at?: string | null
          recipient_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actor_user_id?: string | null
          archived_at?: string | null
          body?: string | null
          chat_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance?: string
          link_path?: string | null
          message_id?: string | null
          metadata?: Json
          notification_type?: string
          order_id?: string | null
          read_at?: string | null
          recipient_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: string
          order_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          order_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reference_assets: {
        Row: {
          b_user_id: string
          created_at: string
          creator_user_id: string
          file_name: string
          file_type: string
          id: string
          mime_type: string
          order_id: string
          size_bytes: number
          sort_order: number
          storage_bucket: string
          storage_path: string
          uploaded_by_user_id: string
        }
        Insert: {
          b_user_id: string
          created_at?: string
          creator_user_id: string
          file_name: string
          file_type: string
          id?: string
          mime_type: string
          order_id: string
          size_bytes: number
          sort_order?: number
          storage_bucket?: string
          storage_path: string
          uploaded_by_user_id: string
        }
        Update: {
          b_user_id?: string
          created_at?: string
          creator_user_id?: string
          file_name?: string
          file_type?: string
          id?: string
          mime_type?: string
          order_id?: string
          size_bytes?: number
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reference_assets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          authorized_at: string | null
          auto_complete_at: string | null
          b_user_id: string
          buyer_marketplace_fee_amount: number | null
          buyer_marketplace_fee_rate_bps: number | null
          buyer_plan_code_snapshot: string | null
          buyer_plan_public_name_snapshot: string | null
          buyer_total_amount: number | null
          canceled_at: string | null
          captured_at: string | null
          completed_at: string | null
          completed_reason: string | null
          created_at: string
          creator_accept_deadline: string | null
          creator_id: string
          creator_menu_id: string
          creator_payout_amount: number
          creator_transaction_fee_amount: number | null
          creator_transaction_fee_rate_bps: number | null
          creator_user_id: string
          currency: string
          deadline: string | null
          declined_at: string | null
          delivered_at: string | null
          delivered_post_url: string | null
          disputed_at: string | null
          expired_at: string | null
          fee_rate_bps: number
          fulfillment_type: string
          has_free_offer: boolean
          id: string
          linked_request_id: string | null
          materials_confirmed_at: string | null
          materials_provided_at: string | null
          max_revision_count: number
          menu_allow_secondary_use_snapshot: boolean
          menu_category_snapshot: string | null
          menu_deliverables_snapshot: string | null
          menu_delivery_days_snapshot: number | null
          menu_description_snapshot: string | null
          menu_platform_snapshot: string | null
          menu_price_amount: number
          menu_title_snapshot: string
          menu_type_snapshot: string | null
          metadata: Json
          payment_flow: string | null
          payment_status: string
          payout_batch_id: string | null
          payout_due_at: string | null
          payout_method: string
          payout_note: string | null
          payout_paid_at: string | null
          payout_status: string
          platform_fee_amount: number
          platform_gross_revenue_amount: number | null
          post_notes: string | null
          pr_account: string | null
          pr_copy_text: string | null
          pr_hashtags: string[]
          preparation_data: Json
          preparation_ready_at: string | null
          preparation_started_at: string | null
          preparation_status: string
          product_name: string
          product_url: string | null
          project_type: string | null
          received_at: string | null
          requirements: string
          revision_count: number
          revision_note: string | null
          revision_requested_at: string | null
          shipped_at: string | null
          shipping_address_shared_at: string | null
          shipping_carrier: string | null
          shipping_tracking_number: string | null
          status: string
          stripe_amount: number
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          stripe_transfer_id: string | null
          transfer_attempted_at: string | null
          transfer_failed_reason: string | null
          transfer_status: string
          transferred_at: string | null
          updated_at: string
          visit_candidate_note: string | null
          visit_location: string | null
          visit_notes: string | null
          visit_scheduled_at: string | null
          wants_secondary_use: boolean
          work_started_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          authorized_at?: string | null
          auto_complete_at?: string | null
          b_user_id: string
          buyer_marketplace_fee_amount?: number | null
          buyer_marketplace_fee_rate_bps?: number | null
          buyer_plan_code_snapshot?: string | null
          buyer_plan_public_name_snapshot?: string | null
          buyer_total_amount?: number | null
          canceled_at?: string | null
          captured_at?: string | null
          completed_at?: string | null
          completed_reason?: string | null
          created_at?: string
          creator_accept_deadline?: string | null
          creator_id: string
          creator_menu_id: string
          creator_payout_amount?: number
          creator_transaction_fee_amount?: number | null
          creator_transaction_fee_rate_bps?: number | null
          creator_user_id: string
          currency?: string
          deadline?: string | null
          declined_at?: string | null
          delivered_at?: string | null
          delivered_post_url?: string | null
          disputed_at?: string | null
          expired_at?: string | null
          fee_rate_bps?: number
          fulfillment_type?: string
          has_free_offer?: boolean
          id?: string
          linked_request_id?: string | null
          materials_confirmed_at?: string | null
          materials_provided_at?: string | null
          max_revision_count?: number
          menu_allow_secondary_use_snapshot?: boolean
          menu_category_snapshot?: string | null
          menu_deliverables_snapshot?: string | null
          menu_delivery_days_snapshot?: number | null
          menu_description_snapshot?: string | null
          menu_platform_snapshot?: string | null
          menu_price_amount: number
          menu_title_snapshot: string
          menu_type_snapshot?: string | null
          metadata?: Json
          payment_flow?: string | null
          payment_status?: string
          payout_batch_id?: string | null
          payout_due_at?: string | null
          payout_method?: string
          payout_note?: string | null
          payout_paid_at?: string | null
          payout_status?: string
          platform_fee_amount?: number
          platform_gross_revenue_amount?: number | null
          post_notes?: string | null
          pr_account?: string | null
          pr_copy_text?: string | null
          pr_hashtags?: string[]
          preparation_data?: Json
          preparation_ready_at?: string | null
          preparation_started_at?: string | null
          preparation_status?: string
          product_name: string
          product_url?: string | null
          project_type?: string | null
          received_at?: string | null
          requirements: string
          revision_count?: number
          revision_note?: string | null
          revision_requested_at?: string | null
          shipped_at?: string | null
          shipping_address_shared_at?: string | null
          shipping_carrier?: string | null
          shipping_tracking_number?: string | null
          status?: string
          stripe_amount: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          stripe_transfer_id?: string | null
          transfer_attempted_at?: string | null
          transfer_failed_reason?: string | null
          transfer_status?: string
          transferred_at?: string | null
          updated_at?: string
          visit_candidate_note?: string | null
          visit_location?: string | null
          visit_notes?: string | null
          visit_scheduled_at?: string | null
          wants_secondary_use?: boolean
          work_started_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          authorized_at?: string | null
          auto_complete_at?: string | null
          b_user_id?: string
          buyer_marketplace_fee_amount?: number | null
          buyer_marketplace_fee_rate_bps?: number | null
          buyer_plan_code_snapshot?: string | null
          buyer_plan_public_name_snapshot?: string | null
          buyer_total_amount?: number | null
          canceled_at?: string | null
          captured_at?: string | null
          completed_at?: string | null
          completed_reason?: string | null
          created_at?: string
          creator_accept_deadline?: string | null
          creator_id?: string
          creator_menu_id?: string
          creator_payout_amount?: number
          creator_transaction_fee_amount?: number | null
          creator_transaction_fee_rate_bps?: number | null
          creator_user_id?: string
          currency?: string
          deadline?: string | null
          declined_at?: string | null
          delivered_at?: string | null
          delivered_post_url?: string | null
          disputed_at?: string | null
          expired_at?: string | null
          fee_rate_bps?: number
          fulfillment_type?: string
          has_free_offer?: boolean
          id?: string
          linked_request_id?: string | null
          materials_confirmed_at?: string | null
          materials_provided_at?: string | null
          max_revision_count?: number
          menu_allow_secondary_use_snapshot?: boolean
          menu_category_snapshot?: string | null
          menu_deliverables_snapshot?: string | null
          menu_delivery_days_snapshot?: number | null
          menu_description_snapshot?: string | null
          menu_platform_snapshot?: string | null
          menu_price_amount?: number
          menu_title_snapshot?: string
          menu_type_snapshot?: string | null
          metadata?: Json
          payment_flow?: string | null
          payment_status?: string
          payout_batch_id?: string | null
          payout_due_at?: string | null
          payout_method?: string
          payout_note?: string | null
          payout_paid_at?: string | null
          payout_status?: string
          platform_fee_amount?: number
          platform_gross_revenue_amount?: number | null
          post_notes?: string | null
          pr_account?: string | null
          pr_copy_text?: string | null
          pr_hashtags?: string[]
          preparation_data?: Json
          preparation_ready_at?: string | null
          preparation_started_at?: string | null
          preparation_status?: string
          product_name?: string
          product_url?: string | null
          project_type?: string | null
          received_at?: string | null
          requirements?: string
          revision_count?: number
          revision_note?: string | null
          revision_requested_at?: string | null
          shipped_at?: string | null
          shipping_address_shared_at?: string | null
          shipping_carrier?: string | null
          shipping_tracking_number?: string | null
          status?: string
          stripe_amount?: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          stripe_transfer_id?: string | null
          transfer_attempted_at?: string | null
          transfer_failed_reason?: string | null
          transfer_status?: string
          transferred_at?: string | null
          updated_at?: string
          visit_candidate_note?: string | null
          visit_location?: string | null
          visit_notes?: string | null
          visit_scheduled_at?: string | null
          wants_secondary_use?: boolean
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_creator_menu_id_fkey"
            columns: ["creator_menu_id"]
            isOneToOne: false
            referencedRelation: "creator_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_linked_request_id_fkey"
            columns: ["linked_request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batch_items: {
        Row: {
          account_holder_kana: string | null
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          bank_code: string | null
          bank_name: string | null
          branch_code: string | null
          branch_name: string | null
          created_at: string
          creator_id: string
          creator_user_id: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          order_id: string
          paid_at: string | null
          payout_amount: number
          payout_batch_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_holder_kana?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id: string
          creator_user_id: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payout_amount: number
          payout_batch_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_holder_kana?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          branch_name?: string | null
          created_at?: string
          creator_id?: string
          creator_user_id?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payout_amount?: number
          payout_batch_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_batch_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_batch_items_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          admin_note: string | null
          created_at: string
          created_by_user_id: string | null
          csv_file_name: string | null
          currency: string
          exported_at: string | null
          id: string
          paid_at: string | null
          payout_method: string
          period_end: string
          period_start: string
          status: string
          total_creators: number
          total_orders: number
          total_payout_amount: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          created_by_user_id?: string | null
          csv_file_name?: string | null
          currency?: string
          exported_at?: string | null
          id?: string
          paid_at?: string | null
          payout_method?: string
          period_end: string
          period_start: string
          status?: string
          total_creators?: number
          total_orders?: number
          total_payout_amount?: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          created_by_user_id?: string | null
          csv_file_name?: string | null
          currency?: string
          exported_at?: string | null
          id?: string
          paid_at?: string | null
          payout_method?: string
          period_end?: string
          period_start?: string
          status?: string
          total_creators?: number
          total_orders?: number
          total_payout_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string
          id: string
          instagram_url: string | null
          is_public: boolean | null
          is_suspended: boolean
          onboarding_completed: boolean
          public_profile_completed: boolean
          suspend_level: number | null
          suspend_reason: string | null
          suspended_at: string | null
          tiktok_url: string | null
          updated_at: string | null
          username: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          is_suspended?: boolean
          onboarding_completed?: boolean
          public_profile_completed?: boolean
          suspend_level?: number | null
          suspend_reason?: string | null
          suspended_at?: string | null
          tiktok_url?: string | null
          updated_at?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          is_suspended?: boolean
          onboarding_completed?: boolean
          public_profile_completed?: boolean
          suspend_level?: number | null
          suspend_reason?: string | null
          suspended_at?: string | null
          tiktok_url?: string | null
          updated_at?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          accepted_by: string | null
          admin_approved_at: string | null
          b_user_id: string
          company_approved_at: string | null
          created_at: string
          creator_menu_id: string | null
          creator_user_id: string
          deadline: string | null
          delivered_at: string | null
          delivered_post_url: string | null
          has_free_offer: boolean | null
          id: string
          note: string | null
          product_name: string | null
          product_url: string | null
          requested_budget: number | null
          requested_platform: string | null
          status: string | null
          updated_at: string | null
          wants_secondary_use: boolean
        }
        Insert: {
          accepted_by?: string | null
          admin_approved_at?: string | null
          b_user_id: string
          company_approved_at?: string | null
          created_at?: string
          creator_menu_id?: string | null
          creator_user_id: string
          deadline?: string | null
          delivered_at?: string | null
          delivered_post_url?: string | null
          has_free_offer?: boolean | null
          id?: string
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          requested_budget?: number | null
          requested_platform?: string | null
          status?: string | null
          updated_at?: string | null
          wants_secondary_use?: boolean
        }
        Update: {
          accepted_by?: string | null
          admin_approved_at?: string | null
          b_user_id?: string
          company_approved_at?: string | null
          created_at?: string
          creator_menu_id?: string | null
          creator_user_id?: string
          deadline?: string | null
          delivered_at?: string | null
          delivered_post_url?: string | null
          has_free_offer?: boolean | null
          id?: string
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          requested_budget?: number | null
          requested_platform?: string | null
          status?: string | null
          updated_at?: string | null
          wants_secondary_use?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "requests_creator_menu_id_fkey"
            columns: ["creator_menu_id"]
            isOneToOne: false
            referencedRelation: "creator_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_creators: {
        Row: {
          b_user_id: string
          created_at: string
          creator_id: string
          id: string
        }
        Insert: {
          b_user_id: string
          created_at?: string
          creator_id: string
          id?: string
        }
        Update: {
          b_user_id?: string
          created_at?: string
          creator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: number
          role: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: number
          role: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: number
          role?: string
          token?: string
        }
        Relationships: []
      }
      signup_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          role: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role?: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_states: {
        Row: {
          company_access_status: string
          company_plan_code: string
          company_profile_completed: boolean
          company_subscription_status: string
          created_at: string
          creator_profile_completed: boolean
          monthly_request_limit: number | null
          monthly_request_used: number
          onboarding_completed: boolean
          privacy_agreed_at: string | null
          privacy_version: string | null
          request_usage_reset_at: string | null
          stripe_cancel_at_period_end: boolean | null
          stripe_current_period_end: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          terms_agreed_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_access_status?: string
          company_plan_code?: string
          company_profile_completed?: boolean
          company_subscription_status?: string
          created_at?: string
          creator_profile_completed?: boolean
          monthly_request_limit?: number | null
          monthly_request_used?: number
          onboarding_completed?: boolean
          privacy_agreed_at?: string | null
          privacy_version?: string | null
          request_usage_reset_at?: string | null
          stripe_cancel_at_period_end?: boolean | null
          stripe_current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_access_status?: string
          company_plan_code?: string
          company_profile_completed?: boolean
          company_subscription_status?: string
          created_at?: string
          creator_profile_completed?: boolean
          monthly_request_limit?: number | null
          monthly_request_used?: number
          onboarding_completed?: boolean
          privacy_agreed_at?: string | null
          privacy_version?: string | null
          request_usage_reset_at?: string | null
          stripe_cancel_at_period_end?: boolean | null
          stripe_current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_statuses: {
        Row: {
          created_at: string | null
          onboarding_completed: boolean
          public_profile_completed: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          onboarding_completed?: boolean
          public_profile_completed?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          onboarding_completed?: boolean
          public_profile_completed?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          admin_note: string | null
          created_at: string | null
          id: string
          is_active: boolean
          level: string
          reason: string
          released_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          level: string
          reason: string
          released_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          level?: string
          reason?: string
          released_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          id: string | null
          instagram_url: string | null
          tiktok_url: string | null
          username: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          id?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          id?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_app_notification: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_chat_id: string
          p_dedupe_key: string
          p_entity_id: string
          p_entity_type: string
          p_importance: string
          p_link_path: string
          p_message_id: string
          p_metadata: Json
          p_notification_type: string
          p_order_id: string
          p_recipient_user_id: string
          p_title: string
        }
        Returns: string
      }
      enqueue_line_delivery_for_notification: {
        Args: {
          p_link_path: string
          p_notification_id: string
          p_notification_type: string
          p_recipient_user_id: string
        }
        Returns: undefined
      }
      is_limit_trading: { Args: { p_user_id: string }; Returns: boolean }
      mark_chat_read: {
        Args: { _chat_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
