import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, description, address, phone, instagram, opening_hours, delivery_enabled, delivery_radius_km"
      )
      .eq("slug", "burger-house")
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No se encontró el restaurante con slug "burger-house".',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      restaurant: data[0],
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error inesperado al conectar con Supabase.",
      },
      { status: 500 }
    );
  }
}