/*
 * Tipos de la base de Supabase.
 *
 * Escritos a mano a partir del esquema real (information_schema) porque
 * desde este entorno no se puede correr `supabase gen types`. Si cambiás
 * tablas, podés regenerarlos con:
 *
 *   npx supabase gen types typescript --project-id <id> > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          address: string | null;
          phone: string | null;
          instagram: string | null;
          opening_hours: string | null;
          delivery_enabled: boolean | null;
          delivery_radius_km: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          address?: string | null;
          phone?: string | null;
          instagram?: string | null;
          opening_hours?: string | null;
          delivery_enabled?: boolean | null;
          delivery_radius_km?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          slug: string;
          emoji: string | null;
          sort_order: number | null;
          active: boolean | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          slug: string;
          emoji?: string | null;
          sort_order?: number | null;
          active?: boolean | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          image_url: string | null;
          available: boolean | null;
          badge: string | null;
          featured: boolean | null;
          sort_order: number | null;
          created_at: Timestamp | null;
          updated_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          available?: boolean | null;
          badge?: string | null;
          featured?: boolean | null;
          sort_order?: number | null;
          created_at?: Timestamp | null;
          updated_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          selection_type: string;
          required: boolean | null;
          sort_order: number | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          selection_type: string;
          required?: boolean | null;
          sort_order?: number | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["product_options"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_items: {
        Row: {
          id: string;
          option_group_id: string;
          name: string;
          price: number | null;
          available: boolean | null;
          sort_order: number | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          option_group_id: string;
          name: string;
          price?: number | null;
          available?: boolean | null;
          sort_order?: number | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["product_option_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_option_items_option_group_id_fkey";
            columns: ["option_group_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
        ];
      };
      product_ingredients: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sort_order: number | null;
          available: boolean | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sort_order?: number | null;
          available?: boolean | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["product_ingredients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          order_number: string;
          customer_name: string;
          customer_phone: string | null;
          customer_address: string | null;
          order_type: string;
          payment_method: string | null;
          status: string;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          notes: string | null;
          created_at: Timestamp | null;
          updated_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          order_number: string;
          customer_name: string;
          customer_phone?: string | null;
          customer_address?: string | null;
          order_type: string;
          payment_method?: string | null;
          status?: string;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          total?: number;
          notes?: string | null;
          created_at?: Timestamp | null;
          updated_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          unit_price: number;
          total_price: number;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_options: {
        Row: {
          id: string;
          order_item_id: string;
          option_name: string;
          option_value: string;
          price: number | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          option_name: string;
          option_value: string;
          price?: number | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_item_options"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_burger_house_order: {
        Args: {
          p_order: Json;
          p_items: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
