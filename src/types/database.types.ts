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
      categories: {
        Row: {
          base_price: number
          created_at: string
          icon_name: string
          id: string
          name: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          icon_name: string
          id?: string
          name: string
        }
        Update: {
          base_price?: number
          created_at?: string
          icon_name?: string
          id?: string
          name?: string
        }
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          name: string
          phone: string | null
          photo_url: string | null
          role: 'customer' | 'provider'
        }
        Insert: {
          city?: string | null
          created_at?: string
          id: string
          location_lat?: number | null
          location_lng?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          role?: 'customer' | 'provider'
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: 'customer' | 'provider'
        }
      }
      providers: {
        Row: {
          available: boolean | null
          base_price: number | null
          bio: string | null
          category: string | null
          created_at: string
          id: string
          rating: number | null
          tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null
          total_earnings: number | null
          total_jobs: number | null
        }
        Insert: {
          available?: boolean | null
          base_price?: number | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id: string
          rating?: number | null
          tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null
          total_earnings?: number | null
          total_jobs?: number | null
        }
        Update: {
          available?: boolean | null
          base_price?: number | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null
          total_earnings?: number | null
          total_jobs?: number | null
        }
      }
    }
  }
}
