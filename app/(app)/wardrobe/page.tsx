import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WardrobeShell } from "@/components/wardrobe/WardrobeShell";

export default async function WardrobePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [itemsRes, outfitsRes] = await Promise.all([
    admin
      .from("wardrobe_items")
      .select("id, storage_path, category, color, description, brand, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("saved_outfits")
      .select("id, name, item_ids, generated_image_path, caption, worn_count, last_worn, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Sign URLs for wardrobe items
  const items = itemsRes.data?.length
    ? await Promise.all(
        itemsRes.data.map(async (item) => {
          const { data } = await admin.storage.from("wardrobe").createSignedUrl(item.storage_path, 3600);
          return { ...item, url: data?.signedUrl ?? "" };
        })
      )
    : [];

  // Sign URLs for saved outfit generated images
  const outfits = outfitsRes.data?.length
    ? await Promise.all(
        outfitsRes.data.map(async (outfit) => {
          if (!outfit.generated_image_path) return { ...outfit, imageUrl: "" };
          const { data } = await admin.storage.from("wardrobe").createSignedUrl(outfit.generated_image_path, 3600);
          return { ...outfit, imageUrl: data?.signedUrl ?? "" };
        })
      )
    : [];

  return <WardrobeShell items={items} outfits={outfits} />;
}
