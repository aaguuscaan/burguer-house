import { storeConfig } from "@/app/data/store";
import { supabase } from "@/lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";

export type AdminCategory = {
  id: string;
  name: string;
  emoji: string | null;
};

export type AdminProductSummary = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  available: boolean;
  badge: string | null;
  categoryId: string | null;
  sortOrder: number;
};

export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  badge: string;
  available: boolean;
  featured: boolean;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  badge: "",
  available: true,
  featured: false,
};

/* ------------------------------------------------------------------ */

export async function fetchCategories(): Promise<AdminCategory[] | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, emoji")
    .eq("restaurant_id", storeConfig.restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error cargando categorías:", error);
    return null;
  }

  return data;
}

export async function fetchProductSummaries(): Promise<
  AdminProductSummary[] | null
> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, image_url, available, badge, category_id, sort_order")
    .eq("restaurant_id", storeConfig.restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error cargando productos:", error);
    return null;
  }

  return data.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    imageUrl: product.image_url,
    available: product.available ?? true,
    badge: product.badge,
    categoryId: product.category_id,
    sortOrder: product.sort_order ?? 0,
  }));
}

export async function fetchProductForm(
  productId: string
): Promise<ProductFormValues | null | "not-found"> {
  const { data, error } = await supabase
    .from("products")
    .select("name, description, price, category_id, image_url, badge, available, featured")
    .eq("id", productId)
    .eq("restaurant_id", storeConfig.restaurantId)
    .maybeSingle();

  if (error) {
    console.error("Error cargando producto:", error);
    return null;
  }

  if (!data) {
    return "not-found";
  }

  return {
    name: data.name,
    description: data.description ?? "",
    price: String(Number(data.price)),
    categoryId: data.category_id ?? "",
    imageUrl: data.image_url ?? "",
    badge: data.badge ?? "",
    available: data.available ?? true,
    featured: data.featured ?? false,
  };
}

/* ------------------------------------------------------------------ */
/* Validación y guardado                                               */
/* ------------------------------------------------------------------ */

export type ProductFormErrors = Partial<
  Record<"name" | "price" | "categoryId", string>
>;

export function validateProduct(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const price = Number(values.price);

  if (values.name.trim().length < 2) {
    errors.name = "Poné un nombre.";
  }

  if (!values.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = "Poné un precio mayor a 0.";
  }

  if (!values.categoryId) {
    errors.categoryId = "Elegí una categoría.";
  }

  return errors;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productColumns(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    price: Number(values.price),
    category_id: values.categoryId,
    image_url: values.imageUrl.trim() || null,
    badge: values.badge.trim().toUpperCase() || null,
    available: values.available,
    featured: values.featured,
  };
}

const UNIQUE_VIOLATION = "23505";

export async function createProduct(
  values: ProductFormValues
): Promise<string | null> {
  const base = slugify(values.name) || "producto";

  /* El slug es único por restaurante: si choca, se agrega un sufijo. */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await supabase
      .from("products")
      .insert({
        ...productColumns(values),
        restaurant_id: storeConfig.restaurantId,
        slug,
        sort_order: 999,
      })
      .select("id")
      .single();

    if (!error) {
      return data.id;
    }

    if (error.code !== UNIQUE_VIOLATION) {
      console.error("Error creando producto:", error);
      return null;
    }
  }

  return null;
}

export async function updateProduct(productId: string, values: ProductFormValues) {
  const { error } = await supabase
    .from("products")
    .update({ ...productColumns(values), updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    console.error("Error guardando producto:", error);
    return false;
  }

  return true;
}

export async function setProductAvailable(productId: string, available: boolean) {
  const { error } = await supabase
    .from("products")
    .update({ available, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    console.error("Error cambiando disponibilidad:", error);
    return false;
  }

  return true;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    console.error("Error borrando producto:", error);
    return false;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/* Fotos                                                               */
/* ------------------------------------------------------------------ */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadProductImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "Usá una imagen JPG, PNG, WEBP o AVIF." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "La imagen pesa más de 5 MB." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${storeConfig.restaurantId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });

  if (error) {
    console.error("Error subiendo imagen:", error);
    return { ok: false, message: "No pudimos subir la imagen. Probá de nuevo." };
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  return { ok: true, url: data.publicUrl };
}
