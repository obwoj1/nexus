import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { WorkoutsShell } from "@/components/workouts/WorkoutsShell";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const cookieStore = await cookies();
  const tz = cookieStore.get("nexus-tz")?.value ?? "America/New_York";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

  const ninetyDaysAgo = (() => {
    const d = new Date(today); d.setDate(d.getDate() - 90);
    return d.toISOString().split("T")[0];
  })();

  const [exercisesRes, todaySessionRes, recentSessionsRes, templatesRes, rawPhotos] = await Promise.all([
    admin.from("exercises").select("*").order("muscle_group").order("name"),
    admin
      .from("workout_sessions")
      .select(`id, name, date, duration_minutes, notes,
        session_sets(id, set_number, reps, weight_lbs, exercise_id,
          exercises(id, name, muscle_group, equipment, type))`)
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    admin
      .from("workout_sessions")
      .select(`id, name, date, duration_minutes,
        session_sets(id, set_number, reps, weight_lbs, exercise_id,
          exercises(id, name, muscle_group))`)
      .eq("user_id", user.id)
      .neq("date", today)
      .gte("date", ninetyDaysAgo)
      .order("date", { ascending: false }),
    admin
      .from("workout_templates")
      .select(`id, name,
        template_exercises(id, exercise_id, display_order,
          exercises(id, name, muscle_group, equipment, type))`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("body_photos")
      .select("id, storage_path, date, notes")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  // Generate signed URLs for photos (1-hour validity)
  const photos = rawPhotos.data?.length
    ? await Promise.all(
        rawPhotos.data.map(async (p) => {
          const { data } = await admin.storage
            .from("body-progress")
            .createSignedUrl(p.storage_path, 3600);
          return { ...p, url: data?.signedUrl ?? "" };
        }),
      )
    : [];

  return (
    <WorkoutsShell
      exercises={exercisesRes.data ?? []}
      todaySession={todaySessionRes.data ?? null}
      recentSessions={recentSessionsRes.data ?? []}
      templates={templatesRes.data ?? []}
      photos={photos}
      today={today}
    />
  );
}
