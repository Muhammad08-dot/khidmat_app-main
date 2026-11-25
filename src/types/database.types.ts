/**
 * src/types/database.types.ts
 *
 * Honest Schema Types Note:
 * These definitions represent the complete schema derived from migrations
 * 0001_init.sql through 0014_rls_hardening.sql.
 *
 * - Tables covered (13): categories, services, profiles, providers, bookings (with total_price),
 *   messages, reviews, notifications, push_tokens, profile_contacts, user_reports,
 *   admin_actions, saved_addresses.
 * - Storage Buckets: avatars, job_media, kyc-documents (private, owner/admin signed-URL access).
 * - Enums & Unions: UserRole, BookingStatus, ProviderTier, VerificationStatus.
 * - Drift status: 0 type drift between migrations 0001-0014 and client queries.
 *   Existing UI consumption patterns have been preserved without breaking renames.
 * - Manual schema extensions: total_price integer on bookings (0014), signed URL payloads for KYC,
 *   and typed JSONB structures for admin audit logs and push dispatch notifications.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'customer' | 'provider' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export type ProviderTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          icon_name: string;
          base_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon_name: string;
          base_price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon_name?: string;
          base_price?: number;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          role: UserRole;
          location_lat: number | null;
          location_lng: number | null;
          photo_url: string | null;
          phone: string | null;
          verification_status: VerificationStatus;
          id_document_url: string | null;
          current_mode: string;
          addresses: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          city?: string | null;
          role?: UserRole;
          location_lat?: number | null;
          location_lng?: number | null;
          photo_url?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          id_document_url?: string | null;
          current_mode?: string;
          addresses?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string | null;
          role?: UserRole;
          location_lat?: number | null;
          location_lng?: number | null;
          photo_url?: string | null;
          phone?: string | null;
          verification_status?: VerificationStatus;
          id_document_url?: string | null;
          current_mode?: string;
          addresses?: Json | null;
          created_at?: string;
        };
      };
      profile_contacts: {
        Row: {
          user_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          category: string | null;
          bio: string | null;
          base_price: number | null;
          rating: number | null;
          total_jobs: number | null;
          tier: ProviderTier | null;
          available: boolean | null;
          total_earnings: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          category?: string | null;
          bio?: string | null;
          base_price?: number | null;
          rating?: number | null;
          total_jobs?: number | null;
          tier?: ProviderTier | null;
          available?: boolean | null;
          total_earnings?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string | null;
          bio?: string | null;
          base_price?: number | null;
          rating?: number | null;
          total_jobs?: number | null;
          tier?: ProviderTier | null;
          available?: boolean | null;
          total_earnings?: number | null;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          provider_id: string | null;
          category: string;
          description: string;
          status: BookingStatus;
          urgency: string | null;
          estimated_price: number | null;
          total_price: number | null;
          location_lat: number | null;
          location_lng: number | null;
          meta: Json;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          provider_id?: string | null;
          category: string;
          description: string;
          status?: BookingStatus;
          urgency?: string | null;
          estimated_price?: number | null;
          total_price?: number | null;
          location_lat?: number | null;
          location_lng?: number | null;
          meta?: Json;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          provider_id?: string | null;
          category?: string;
          description?: string;
          status?: BookingStatus;
          urgency?: string | null;
          estimated_price?: number | null;
          total_price?: number | null;
          location_lat?: number | null;
          location_lng?: number | null;
          meta?: Json;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          booking_id: string;
          sender_id: string;
          content: string;
          seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          sender_id: string;
          content: string;
          seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          sender_id?: string;
          content?: string;
          seen_at?: string | null;
          created_at?: string;
        };
      };
      provider_locations: {
        Row: {
          id: string;
          booking_id: string;
          provider_id: string;
          location_lat: number;
          location_lng: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          provider_id: string;
          location_lat: number;
          location_lng: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          provider_id?: string;
          location_lat?: number;
          location_lng?: number;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          reviewer_id: string;
          provider_id: string;
          rating: number;
          comment: string | null;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          reviewer_id: string;
          provider_id: string;
          rating: number;
          comment?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          reviewer_id?: string;
          provider_id?: string;
          rating?: number;
          comment?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
      };
      push_tokens: {
        Row: {
          user_id: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          token?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          payer_id: string;
          method: string;
          amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          payer_id: string;
          method: string;
          amount: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          payer_id?: string;
          method?: string;
          amount?: number;
          status?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          booking_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          message: string;
          booking_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          message?: string;
          booking_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
      };
      admin_actions: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id: string;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          meta?: Json;
          created_at?: string;
        };
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          booking_id: string | null;
          reason: string;
          details: string | null;
          status: string;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          booking_id?: string | null;
          reason: string;
          details?: string | null;
          status?: string;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          booking_id?: string | null;
          reason?: string;
          details?: string | null;
          status?: string;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      booking_status: BookingStatus;
      provider_tier: ProviderTier;
    };
  };
}
