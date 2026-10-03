import "server-only";

import { menuCategories, restaurantMenu, type MenuCategoryId, type MenuItem } from "@/data/restaurant";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LiveMenuCategory = { id: MenuCategoryId; label: string };
export type LiveMenuResult = { mode: "snapshot" | "live" | "error"; items: readonly MenuItem[]; categories: readonly LiveMenuCategory[] };

export async function getLiveMenu(): Promise<LiveMenuResult> {
  if (!getSupabaseConfig()) return { mode: "snapshot", items: restaurantMenu, categories: menuCategories };
  try {
    const supabase = await createSupabaseServerClient();
    const [categoryResult, itemResult] = await Promise.all([
      supabase.from("menu_categories").select("id,code,name,sort_order").eq("is_active", true).order("sort_order").order("code"),
      supabase.from("menu_items").select("code,category_id,name,description,price,is_available,is_featured").eq("is_active", true).order("sort_order").order("code"),
    ]);
    if (categoryResult.error || itemResult.error) return { mode: "error", items: [], categories: [] };
    const categoryById = new Map((categoryResult.data ?? []).map((category) => [category.id as string, category]));
    const canonicalByCode = new Map(restaurantMenu.map((item) => [item.code, item]));
    const categories = (categoryResult.data ?? []).flatMap((category) => {
      const canonical = menuCategories.find((item) => item.id === category.code);
      return canonical ? [{ id: canonical.id, label: category.name }] : [];
    });
    const items = (itemResult.data ?? []).flatMap((row) => {
      const canonical = canonicalByCode.get(row.code as string);
      const category = categoryById.get(row.category_id as string);
      const categoryId = menuCategories.find((item) => item.id === category?.code)?.id;
      if (!canonical || !categoryId) return [];
      return [{ ...canonical, category: categoryId, name: String(row.name), description: String(row.description), price: Number(row.price), available: Boolean(row.is_available), featured: Boolean(row.is_featured) }];
    });
    return { mode: "live", items, categories };
  } catch {
    return { mode: "error", items: [], categories: [] };
  }
}
