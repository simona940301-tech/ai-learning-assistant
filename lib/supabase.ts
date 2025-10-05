import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types (Placeholder)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          bio: string | null
          xp: number
          coins: number
          streak: number
          created_at: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          images: string[]
          likes: number
          created_at: string
        }
      }
      tasks: {
        Row: {
          id: string
          subject: string
          title: string
          xp_reward: number
          coin_reward: number
          completed: boolean
          created_at: string
        }
      }
      backpack_items: {
        Row: {
          id: string
          user_id: string
          subject: string
          type: 'text' | 'pdf' | 'image'
          title: string
          content: string
          file_url: string | null
          created_at: string
        }
      }
      store_items: {
        Row: {
          id: string
          subject: string
          title: string
          description: string
          cover_url: string
          provider: string
          price: number
          is_free: boolean
          created_at: string
        }
      }
    }
  }
}
