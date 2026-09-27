import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        restaurant_id,
        category_id,
        name,
        slug,
        description,
        price,
        image_url,
        available,
        badge,
        featured,
        sort_order,
        categories (
          id,
          name,
          slug,
          emoji
        ),
        product_options (
          id,
          name,
          selection_type,
          required,
          sort_order,
          product_option_items (
            id,
            name,
            price,
            available,
            sort_order
          )
        )
      `)
      .eq("restaurant_id", "926cd9b7-7fa2-4664-8cd8-c65e80ea1956")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Supabase products error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      products: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected products error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error inesperado al obtener los productos.",
      },
      { status: 500 }
    );
  }
}