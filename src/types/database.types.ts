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
      access_passes: {
        Row: {
          created_at: string
          event_ticket_type_id: string | null
          id: string
          order_id: string | null
          qr_token_hash: string
          reservation_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          used_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          event_ticket_type_id?: string | null
          id?: string
          order_id?: string | null
          qr_token_hash: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          used_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          event_ticket_type_id?: string | null
          id?: string
          order_id?: string | null
          qr_token_hash?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          used_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_passes_event_ticket_type_id_fkey"
            columns: ["event_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_passes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_passes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          exterior_number: string | null
          id: string
          interior_number: string | null
          is_default: boolean
          label: string
          neighborhood: string | null
          phone: string | null
          postal_code: string
          recipient_name: string | null
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          exterior_number?: string | null
          id?: string
          interior_number?: string | null
          is_default?: boolean
          label?: string
          neighborhood?: string | null
          phone?: string | null
          postal_code: string
          recipient_name?: string | null
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          exterior_number?: string | null
          id?: string
          interior_number?: string | null
          is_default?: boolean
          label?: string
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string
          recipient_name?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
          request_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_status: Database["public"]["Enums"]["notification_status"]
          error_code: string | null
          id: string
          opened_at: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["notification_status"]
          error_code?: string | null
          id?: string
          opened_at?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["notification_status"]
          error_code?: string | null
          id?: string
          opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          archived_at: string | null
          audience_definition: Json
          channel: string
          content: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          locale: string
          metadata: Json
          name: string
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          scheduled_at: string | null
          sent_at: string | null
          sort_order: number
          status: Database["public"]["Enums"]["campaign_status"]
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          audience_definition?: Json
          channel: string
          content?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          audience_definition?: Json
          channel?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name?: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          metadata: Json
          quantity: number
          unit_price_snapshot: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json
          quantity: number
          unit_price_snapshot: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json
          quantity?: number
          unit_price_snapshot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          expires_at: string | null
          id: string
          session_token: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          session_token?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          session_token?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          access_pass_id: string
          checked_in_at: string
          checked_in_by: string | null
          device_info: Json
          id: string
          notes: string | null
        }
        Insert: {
          access_pass_id: string
          checked_in_at?: string
          checked_in_by?: string | null
          device_info?: Json
          id?: string
          notes?: string | null
        }
        Update: {
          access_pass_id?: string
          checked_in_at?: string
          checked_in_by?: string | null
          device_info?: Json
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_access_pass_id_fkey"
            columns: ["access_pass_id"]
            isOneToOne: false
            referencedRelation: "access_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      content_preview_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          expires_at: string
          id: string
          locale: string
          metadata: Json
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          expires_at: string
          id?: string
          locale?: string
          metadata?: Json
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string
          id?: string
          locale?: string
          metadata?: Json
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      content_publication_jobs: {
        Row: {
          action: string
          attempts: number
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          last_error_code: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          metadata: Json
          processed_at: string | null
          run_at: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          metadata?: Json
          processed_at?: string | null
          run_at: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          metadata?: Json
          processed_at?: string | null
          run_at?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_publication_requirements: {
        Row: {
          active: boolean
          created_at: string
          entity_type: string
          id: string
          label: string
          metadata: Json
          requirement_key: string
          severity: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entity_type: string
          id?: string
          label: string
          metadata?: Json
          requirement_key: string
          severity?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entity_type?: string
          id?: string
          label?: string
          metadata?: Json
          requirement_key?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          archived_at: string | null
          benefits: Json | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          locale: string
          metadata: Json
          notes: string | null
          promotional_message: string | null
          publication_status: Database["public"]["Enums"]["content_status"]
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          seo: Json
          short_description: string | null
          slug: string | null
          subtitle: string | null
          title: string | null
          translation_status: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
        }
        Insert: {
          archived_at?: string | null
          benefits?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          locale: string
          metadata?: Json
          notes?: string | null
          promotional_message?: string | null
          publication_status?: Database["public"]["Enums"]["content_status"]
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          seo?: Json
          short_description?: string | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          translation_status?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
        }
        Update: {
          archived_at?: string | null
          benefits?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          locale?: string
          metadata?: Json
          notes?: string | null
          promotional_message?: string | null
          publication_status?: Database["public"]["Enums"]["content_status"]
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          seo?: Json
          short_description?: string | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          translation_status?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          reason: string | null
          request_id: string | null
          restored_from_version_id: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          request_id?: string | null
          restored_from_version_id?: string | null
          snapshot: Json
          version: number
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          request_id?: string | null
          restored_from_version_id?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_restored_from_version_id_fkey"
            columns: ["restored_from_version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_user_id: string | null
          created_at: string
          customer_id: string
          id: string
          note: string
        }
        Insert: {
          author_user_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          note: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tag_assignments: {
        Row: {
          created_at: string
          customer_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          customer_number: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          last_visit_at: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          source: string | null
          status: Database["public"]["Enums"]["content_status"]
          total_spend: number
          total_visits: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          customer_number: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          last_visit_at?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          total_spend?: number
          total_visits?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          customer_number?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          last_visit_at?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          total_spend?: number
          total_visits?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      distributor_orders: {
        Row: {
          created_at: string
          currency: string
          distributor_id: string
          id: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          distributor_id: string
          id?: string
          order_number: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          distributor_id?: string
          id?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_orders_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["content_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          locale: string
          metadata: Json
          mime_type: string | null
          name: string
          owner_id: string
          owner_type: string
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          size_bytes: number | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string
          unpublish_at: string | null
          updated_by: string | null
          uploaded_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          mime_type?: string | null
          name: string
          owner_id: string
          owner_type: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_path: string
          unpublish_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          mime_type?: string | null
          name?: string
          owner_id?: string
          owner_type?: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          size_bytes?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string
          unpublish_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      event_images: {
        Row: {
          alt_text: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_id: string
          id: string
          locale: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_by: string | null
          url: string
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id: string
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id?: string
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url?: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          active: boolean
          archived_at: string | null
          capacity: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          event_id: string
          id: string
          locale: string
          metadata: Json
          name: string
          price: number
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          reserved_count: number
          sales_end_at: string | null
          sales_start_at: string | null
          sold_count: number
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          capacity: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          locale?: string
          metadata?: Json
          name: string
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sold_count?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          capacity?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          locale?: string
          metadata?: Json
          name?: string
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sold_count?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_allocations: {
        Row: {
          allocation_status: string
          created_at: string
          event_id: string
          event_ticket_type_id: string
          id: string
          order_id: string
          order_item_id: string
          quantity: number
          release_reason: string | null
          updated_at: string
        }
        Insert: {
          allocation_status?: string
          created_at?: string
          event_id: string
          event_ticket_type_id: string
          id?: string
          order_id: string
          order_item_id: string
          quantity: number
          release_reason?: string | null
          updated_at?: string
        }
        Update: {
          allocation_status?: string
          created_at?: string
          event_id?: string
          event_ticket_type_id?: string
          id?: string
          order_id?: string
          order_item_id?: string
          quantity?: number
          release_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_allocations_event_ticket_type_id_fkey"
            columns: ["event_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          capacity: number
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string
          featured: boolean
          id: string
          locale: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          reserved_count: number
          sales_enabled: boolean
          short_description: string | null
          slug: string
          sold_count: number
          sort_order: number
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          subtitle: string | null
          title: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          venue: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          capacity: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at: string
          featured?: boolean
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sales_enabled?: boolean
          short_description?: string | null
          slug: string
          sold_count?: number
          sort_order?: number
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string
          featured?: boolean
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sales_enabled?: boolean
          short_description?: string | null
          slug?: string
          sold_count?: number
          sort_order?: number
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          venue?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      experience_blockouts: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          experience_id: string | null
          id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          experience_id?: string | null
          id?: string
          reason?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          experience_id?: string | null
          id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_blockouts_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_images: {
        Row: {
          alt_text: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          experience_id: string
          id: string
          locale: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_by: string | null
          url: string
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          experience_id: string
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          experience_id?: string
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url?: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "experience_images_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_slots: {
        Row: {
          archived_at: string | null
          capacity: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_at: string
          experience_id: string
          id: string
          locale: string
          metadata: Json
          notes: string | null
          price_override: number | null
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          reserved_count: number
          sort_order: number
          start_at: string
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          capacity: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_at: string
          experience_id: string
          id?: string
          locale?: string
          metadata?: Json
          notes?: string | null
          price_override?: number | null
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sort_order?: number
          start_at: string
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          capacity?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_at?: string
          experience_id?: string
          id?: string
          locale?: string
          metadata?: Json
          notes?: string | null
          price_override?: number | null
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          reserved_count?: number
          sort_order?: number
          start_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "experience_slots_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          archived_at: string | null
          base_price: number
          capacity: number
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          featured: boolean
          id: string
          locale: string
          location: string | null
          max_people: number
          metadata: Json
          min_people: number
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          short_description: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          title: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          base_price?: number
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes: number
          featured?: boolean
          id?: string
          locale?: string
          location?: string | null
          max_people?: number
          metadata?: Json
          min_people?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          base_price?: number
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: string
          locale?: string
          location?: string | null
          max_people?: number
          metadata?: Json
          min_people?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          location_id: string
          quantity: number
          reorder_point: number
          reserved_quantity: number
          updated_at: string
          wine_id: string
        }
        Insert: {
          id?: string
          location_id: string
          quantity?: number
          reorder_point?: number
          reserved_quantity?: number
          updated_at?: string
          wine_id: string
        }
        Update: {
          id?: string
          location_id?: string
          quantity?: number
          reorder_point?: number
          reserved_quantity?: number
          updated_at?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          membership_id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          membership_id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_benefits: {
        Row: {
          benefit_code: string
          created_at: string
          id: string
          membership_id: string
          usage_limit: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          benefit_code: string
          created_at?: string
          id?: string
          membership_id: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          benefit_code?: string
          created_at?: string
          id?: string
          membership_id?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_benefits_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          archived_at: string | null
          benefits: Json
          billing_period: string
          code: string
          created_at: string
          created_by: string | null
          daily_sommelier_limit: number
          deleted_at: string | null
          description: string | null
          id: string
          locale: string
          metadata: Json
          name: string
          price: number
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          benefits?: Json
          billing_period: string
          code: string
          created_at?: string
          created_by?: string | null
          daily_sommelier_limit?: number
          deleted_at?: string | null
          description?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name: string
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          benefits?: Json
          billing_period?: string
          code?: string
          created_at?: string
          created_by?: string | null
          daily_sommelier_limit?: number
          deleted_at?: string | null
          description?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name?: string
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      memberships: {
        Row: {
          auto_renew: boolean
          created_at: string
          customer_id: string
          ends_at: string | null
          id: string
          membership_number: string
          plan_id: string
          points_balance: number
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          customer_id: string
          ends_at?: string | null
          id?: string
          membership_number: string
          plan_id: string
          points_balance?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          customer_id?: string
          ends_at?: string | null
          id?: string
          membership_number?: string
          plan_id?: string
          points_balance?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_devices: {
        Row: {
          active: boolean
          created_at: string
          firebase_token: string
          id: string
          last_seen_at: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          firebase_token: string
          id?: string
          last_seen_at?: string | null
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          firebase_token?: string
          id?: string
          last_seen_at?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          customer_id: string | null
          data: Json
          id: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          customer_id?: string | null
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          metadata: Json
          name_snapshot: string
          order_id: string
          quantity: number
          sku_snapshot: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json
          name_snapshot: string
          order_id: string
          quantity: number
          sku_snapshot?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json
          name_snapshot?: string
          order_id?: string
          quantity?: number
          sku_snapshot?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          currency: string
          customer_id: string
          discount_total: number
          id: string
          order_number: string
          reservation_id: string | null
          shipping_address: Json | null
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id: string
          discount_total?: number
          id?: string
          order_number: string
          reservation_id?: string | null
          shipping_address?: Json | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string
          discount_total?: number
          id?: string
          order_number?: string
          reservation_id?: string | null
          shipping_address?: Json | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          error_code: string | null
          event_type: string
          id: string
          payload_hash: string
          processed: boolean
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          event_type: string
          id?: string
          payload_hash: string
          processed?: boolean
          processed_at?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          event_type?: string
          id?: string
          payload_hash?: string
          processed?: boolean
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          payment_method_type: string | null
          provider: string
          provider_payment_id: string | null
          provider_response: Json | null
          refunded_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method_type?: string | null
          provider: string
          provider_payment_id?: string | null
          provider_response?: Json | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method_type?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_response?: Json | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_redemptions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          promotion_id: string
          reservation_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          promotion_id: string
          reservation_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          promotion_id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_targets: {
        Row: {
          created_at: string
          id: string
          promotion_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          promotion_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          promotion_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_targets_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          archived_at: string | null
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          locale: string
          maximum_discount: number | null
          metadata: Json
          minimum_amount: number
          name: string
          promotion_type: string
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          target_segment: string | null
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          usage_limit: number | null
          usage_per_customer: number | null
          used_count: number
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          locale?: string
          maximum_discount?: number | null
          metadata?: Json
          minimum_amount?: number
          name: string
          promotion_type: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_segment?: string | null
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_limit?: number | null
          usage_per_customer?: number | null
          used_count?: number
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          locale?: string
          maximum_discount?: number | null
          metadata?: Json
          minimum_amount?: number
          name?: string
          promotion_type?: string
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_segment?: string | null
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          usage_limit?: number | null
          usage_per_customer?: number | null
          used_count?: number
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      reservation_guests: {
        Row: {
          created_at: string
          dietary_notes: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          reservation_id: string
        }
        Insert: {
          created_at?: string
          dietary_notes?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          reservation_id: string
        }
        Update: {
          created_at?: string
          dietary_notes?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["reservation_status"]
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["reservation_status"]
            | null
          reservation_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["reservation_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["reservation_status"]
            | null
          reservation_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["reservation_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["reservation_status"]
            | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_status_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          customer_notes: string | null
          discount_total: number
          event_id: string | null
          event_ticket_type_id: string | null
          experience_id: string | null
          experience_slot_id: string | null
          id: string
          internal_notes: string | null
          people_count: number
          reservation_number: string
          reservation_type: string
          status: Database["public"]["Enums"]["reservation_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_notes?: string | null
          discount_total?: number
          event_id?: string | null
          event_ticket_type_id?: string | null
          experience_id?: string | null
          experience_slot_id?: string | null
          id?: string
          internal_notes?: string | null
          people_count: number
          reservation_number: string
          reservation_type: string
          status?: Database["public"]["Enums"]["reservation_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_notes?: string | null
          discount_total?: number
          event_id?: string | null
          event_ticket_type_id?: string | null
          experience_id?: string | null
          experience_slot_id?: string | null
          id?: string
          internal_notes?: string | null
          people_count?: number
          reservation_number?: string
          reservation_type?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_event_ticket_type_id_fkey"
            columns: ["event_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_experience_slot_id_fkey"
            columns: ["experience_slot_id"]
            isOneToOne: false
            referencedRelation: "experience_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: Database["public"]["Enums"]["user_role"]
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: Database["public"]["Enums"]["user_role"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          delivery_evidence_url: string | null
          id: string
          order_id: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_evidence_url?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_evidence_url?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sommelier_feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          message_id: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          message_id: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          message_id?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sommelier_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sommelier_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sommelier_knowledge: {
        Row: {
          active: boolean
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          namespace: string
          source_id: string | null
          source_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          namespace: string
          source_id?: string | null
          source_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          namespace?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sommelier_messages: {
        Row: {
          completion_tokens: number | null
          content: string
          created_at: string
          id: string
          model: string | null
          prompt_tokens: number | null
          role: string
          session_id: string
        }
        Insert: {
          completion_tokens?: number | null
          content: string
          created_at?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          role: string
          session_id: string
        }
        Update: {
          completion_tokens?: number | null
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sommelier_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sommelier_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sommelier_sessions: {
        Row: {
          created_at: string
          customer_id: string | null
          ended_at: string | null
          id: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sommelier_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sommelier_usage: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          interaction_count: number
          token_count: number
          updated_at: string
          usage_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          interaction_count?: number
          token_count?: number
          updated_at?: string
          usage_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          interaction_count?: number
          token_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sommelier_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          checked_at: string
          id: string
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string
          id?: string
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string
          id?: string
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          archived_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          key: string
          locale: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          value: Json
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
        }
        Insert: {
          archived_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          key: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Update: {
          archived_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          key?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          language: string
          marketing_email: boolean
          marketing_push: boolean
          timezone: string
          transactional_push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          language?: string
          marketing_email?: boolean
          marketing_push?: boolean
          timezone?: string
          transactional_push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          language?: string
          marketing_email?: boolean
          marketing_push?: boolean
          timezone?: string
          transactional_push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      wine_images: {
        Row: {
          alt_text: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          locale: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          unpublish_at: string | null
          updated_by: string | null
          url: string
          version: number
          visible_in_app: boolean
          visible_in_control: boolean
          wine_id: string
        }
        Insert: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
          wine_id: string
        }
        Update: {
          alt_text?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          locale?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          unpublish_at?: string | null
          updated_by?: string | null
          url?: string
          version?: number
          visible_in_app?: boolean
          visible_in_control?: boolean
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_images_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_pairings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          wine_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_pairings_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_service_notes: {
        Row: {
          created_at: string
          decanting_minutes: number | null
          id: string
          opening_notes: string | null
          storage_notes: string | null
          updated_at: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          decanting_minutes?: number | null
          id?: string
          opening_notes?: string | null
          storage_notes?: string | null
          updated_at?: string
          wine_id: string
        }
        Update: {
          created_at?: string
          decanting_minutes?: number | null
          id?: string
          opening_notes?: string | null
          storage_notes?: string | null
          updated_at?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_service_notes_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: true
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wines: {
        Row: {
          alcohol_percentage: number | null
          archived_at: string | null
          category_id: string | null
          compare_at_price: number | null
          cost: number | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          featured: boolean
          grape_variety: string | null
          id: string
          locale: string
          metadata: Json
          name: string
          origin: string | null
          pairing_notes: string | null
          price: number
          publish_at: string | null
          published_at: string | null
          published_by: string | null
          serving_temperature: string | null
          sku: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          stock_control_enabled: boolean
          stock_quantity: number
          subtitle: string | null
          tasting_notes: string | null
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          vintage: number | null
          visible_in_app: boolean
          visible_in_control: boolean
          volume_ml: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          archived_at?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          grape_variety?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name: string
          origin?: string | null
          pairing_notes?: string | null
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          serving_temperature?: string | null
          sku: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stock_control_enabled?: boolean
          stock_quantity?: number
          subtitle?: string | null
          tasting_notes?: string | null
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          vintage?: number | null
          visible_in_app?: boolean
          visible_in_control?: boolean
          volume_ml?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          archived_at?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          grape_variety?: string | null
          id?: string
          locale?: string
          metadata?: Json
          name?: string
          origin?: string | null
          pairing_notes?: string | null
          price?: number
          publish_at?: string | null
          published_at?: string | null
          published_by?: string | null
          serving_temperature?: string | null
          sku?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stock_control_enabled?: boolean
          stock_quantity?: number
          subtitle?: string | null
          tasting_notes?: string | null
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          vintage?: number | null
          visible_in_app?: boolean
          visible_in_control?: boolean
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wine_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_content:
        | { Args: { entity_type: string }; Returns: boolean }
        | { Args: { action: string; entity_type: string }; Returns: boolean }
      can_publish_content: { Args: { entity_type: string }; Returns: boolean }
      can_restore_content: { Args: { entity_type: string }; Returns: boolean }
      current_customer_id: { Args: never; Returns: string }
      has_any_role: { Args: { role_codes: string[] }; Returns: boolean }
      has_role: { Args: { role_code: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_content_live: {
        Args: {
          archived_at_value: string
          deleted_at_value: string
          publish_at_value: string
          status_value: string
          unpublish_at_value: string
          visible_value: boolean
        }
        Returns: boolean
      }
      normalize_content_entity_type: {
        Args: { raw_entity_type: string }
        Returns: string
      }
      reserve_experience_slot: {
        Args: { p_people_count: number; p_slot_id: string }
        Returns: boolean
      }
      translation_publication_state: {
        Args: { target_entity_id: string; target_entity_type: string }
        Returns: string
      }
    }
    Enums: {
      campaign_status:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      content_status:
        | "draft"
        | "published"
        | "archived"
        | "inactive"
        | "scheduled"
      event_status:
        | "draft"
        | "published"
        | "sold_out"
        | "cancelled"
        | "completed"
        | "scheduled"
        | "inactive"
        | "archived"
      membership_status:
        | "pending"
        | "active"
        | "paused"
        | "expired"
        | "cancelled"
      notification_status: "pending" | "sent" | "failed" | "read"
      order_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "processing"
        | "fulfilled"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "processing"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
      reservation_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      user_role:
        | "super_admin"
        | "admin"
        | "operations"
        | "marketing"
        | "finance"
        | "viewer"
        | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
      campaign_status: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      content_status: [
        "draft",
        "published",
        "archived",
        "inactive",
        "scheduled",
      ],
      event_status: [
        "draft",
        "published",
        "sold_out",
        "cancelled",
        "completed",
        "scheduled",
        "inactive",
        "archived",
      ],
      membership_status: [
        "pending",
        "active",
        "paused",
        "expired",
        "cancelled",
      ],
      notification_status: ["pending", "sent", "failed", "read"],
      order_status: [
        "draft",
        "pending_payment",
        "paid",
        "processing",
        "fulfilled",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "processing",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
        "cancelled",
      ],
      reservation_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      user_role: [
        "super_admin",
        "admin",
        "operations",
        "marketing",
        "finance",
        "viewer",
        "customer",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
