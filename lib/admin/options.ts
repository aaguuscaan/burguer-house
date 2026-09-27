import { supabase } from "@/lib/supabase";

export type EditorItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  sortOrder: number;
};

export type EditorGroup = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  sortOrder: number;
  items: EditorItem[];
};

export type EditorIngredient = {
  id: string;
  name: string;
  available: boolean;
  sortOrder: number;
};

export type ProductOptionsData = {
  groups: EditorGroup[];
  ingredients: EditorIngredient[];
};

function byOrder(a: { sortOrder: number }, b: { sortOrder: number }) {
  return a.sortOrder - b.sortOrder;
}

export async function fetchProductOptions(
  productId: string
): Promise<ProductOptionsData | null> {
  const [groupsResult, ingredientsResult] = await Promise.all([
    supabase
      .from("product_options")
      .select(
        "id, name, selection_type, required, sort_order, product_option_items ( id, name, price, available, sort_order )"
      )
      .eq("product_id", productId),

    supabase
      .from("product_ingredients")
      .select("id, name, available, sort_order")
      .eq("product_id", productId),
  ]);

  if (groupsResult.error || ingredientsResult.error) {
    console.error("Error cargando opciones:", {
      groups: groupsResult.error,
      ingredients: ingredientsResult.error,
    });
    return null;
  }

  return {
    groups: groupsResult.data
      .map(
        (group): EditorGroup => ({
          id: group.id,
          name: group.name,
          type: group.selection_type === "checkbox" ? "checkbox" : "radio",
          required: group.required ?? false,
          sortOrder: group.sort_order ?? 0,
          items: group.product_option_items
            .map((item) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price ?? 0),
              available: item.available ?? true,
              sortOrder: item.sort_order ?? 0,
            }))
            .sort(byOrder),
        })
      )
      .sort(byOrder),

    ingredients: ingredientsResult.data
      .map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        available: ingredient.available ?? true,
        sortOrder: ingredient.sort_order ?? 0,
      }))
      .sort(byOrder),
  };
}

/*
 * Cada operación devuelve true/false y deja el detalle en consola.
 */
async function run(label: string, operation: PromiseLike<{ error: unknown }>) {
  const { error } = await operation;

  if (error) {
    console.error(`Error (${label}):`, error);
    return false;
  }

  return true;
}

export const optionsApi = {
  addGroup: (
    productId: string,
    values: { name: string; type: "radio" | "checkbox"; required: boolean },
    sortOrder: number
  ) =>
    run(
      "crear grupo",
      supabase.from("product_options").insert({
        product_id: productId,
        name: values.name,
        selection_type: values.type,
        required: values.required,
        sort_order: sortOrder,
      })
    ),

  updateGroup: (
    groupId: string,
    values: Partial<{ name: string; type: "radio" | "checkbox"; required: boolean }>
  ) =>
    run(
      "editar grupo",
      supabase
        .from("product_options")
        .update({
          ...(values.name !== undefined && { name: values.name }),
          ...(values.type !== undefined && { selection_type: values.type }),
          ...(values.required !== undefined && { required: values.required }),
        })
        .eq("id", groupId)
    ),

  deleteGroup: (groupId: string) =>
    run("borrar grupo", supabase.from("product_options").delete().eq("id", groupId)),

  addItem: (groupId: string, values: { name: string; price: number }, sortOrder: number) =>
    run(
      "crear opción",
      supabase.from("product_option_items").insert({
        option_group_id: groupId,
        name: values.name,
        price: values.price,
        sort_order: sortOrder,
      })
    ),

  updateItem: (
    itemId: string,
    values: Partial<{ name: string; price: number; available: boolean }>
  ) =>
    run(
      "editar opción",
      supabase.from("product_option_items").update(values).eq("id", itemId)
    ),

  deleteItem: (itemId: string) =>
    run("borrar opción", supabase.from("product_option_items").delete().eq("id", itemId)),

  addIngredient: (productId: string, name: string, sortOrder: number) =>
    run(
      "crear ingrediente",
      supabase.from("product_ingredients").insert({
        product_id: productId,
        name,
        sort_order: sortOrder,
      })
    ),

  updateIngredient: (ingredientId: string, values: Partial<{ available: boolean }>) =>
    run(
      "editar ingrediente",
      supabase.from("product_ingredients").update(values).eq("id", ingredientId)
    ),

  deleteIngredient: (ingredientId: string) =>
    run(
      "borrar ingrediente",
      supabase.from("product_ingredients").delete().eq("id", ingredientId)
    ),
};
