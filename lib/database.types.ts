/*
 * Tipos generados por Supabase (generate_typescript_types).
 * No editar a mano: regenerar cuando cambie el esquema.
 */

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
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          emoji: string | null
          id: string
          name: string
          restaurant_id: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name: string
          restaurant_id: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          created_at: string | null
          id: string
          option_name: string
          option_value: string
          order_item_id: string
          price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_name: string
          option_value: string
          order_item_id: string
          price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_name?: string
          option_value?: string
          order_item_id?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
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
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_address: string | null
          customer_name: string
          customer_phone: string | null
          delivery_fee: number
          discount: number
          id: string
          notes: string | null
          order_number: string
          order_type: string
          payment_method: string | null
          restaurant_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_address?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number: string
          order_type: string
          payment_method?: string | null
          restaurant_id: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          available: boolean | null
          created_at: string | null
          id: string
          name: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_items: {
        Row: {
          available: boolean | null
          created_at: string | null
          id: string
          name: string
          option_group_id: string
          price: number | null
          sort_order: number | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          option_group_id: string
          price?: number | null
          sort_order?: number | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          option_group_id?: string
          price?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_items_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string | null
          id: string
          name: string
          product_id: string
          required: boolean | null
          selection_type: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          product_id: string
          required?: boolean | null
          selection_type: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          product_id?: string
          required?: boolean | null
          selection_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          badge: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          name: string
          price: number
          restaurant_id: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          restaurant_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          restaurant_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          name: string
          restaurant_id: string
          starts_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          name: string
          restaurant_id: string
          starts_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_users: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string | null
          delivery_enabled: boolean | null
          delivery_fee: number
          delivery_free_from: number | null
          delivery_radius_km: number | null
          description: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          opening_hours: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          delivery_enabled?: boolean | null
          delivery_fee?: number
          delivery_free_from?: number | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          delivery_enabled?: boolean | null
          delivery_fee?: number
          delivery_free_from?: number | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_burger_house_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: Json
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
