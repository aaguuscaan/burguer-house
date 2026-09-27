import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      name,
      description,
      price,
      category_id,
      image_url,
      available,
      badge,
      featured,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del producto." },
        { status: 400 }
      );
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    if (!price || Number(price) <= 0) {
      return NextResponse.json(
        { error: "El precio no es válido." },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: "La categoría es obligatoria." },
        { status: 400 }
      );
    }

    const slug = String(name)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({
        name: String(name).trim(),
        slug,
        description:
          description && String(description).trim()
            ? String(description).trim()
            : null,
        price: Number(price),
        category_id,
        image_url:
          image_url && String(image_url).trim()
            ? String(image_url).trim()
            : null,
        available: Boolean(available),
        badge:
          badge && String(badge).trim()
            ? String(badge).trim()
            : null,
        featured: Boolean(featured),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("SUPABASE UPDATE ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data,
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      { status: 500 }
    );
  }
}