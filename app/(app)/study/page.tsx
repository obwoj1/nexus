import { GraduationCap } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { StudyShell } from "@/components/study/StudyShell";

export default async function StudyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const [coursesResult, assignmentsResult, cardsResult, sourcesResult] = await Promise.all([
    admin.from("study_courses").select("id,name,code,term,source").eq("user_id", user.id).order("name"),
    admin.from("study_assignments").select("id,course_id,title,due_at,details,status").eq("user_id", user.id).order("due_at", { ascending: true, nullsFirst: false }),
    admin.from("study_cards").select("id,course_id,front,back,due_at").eq("user_id", user.id).lte("due_at", new Date().toISOString()).order("due_at").limit(100),
    admin.from("study_sources").select("id,course_id,title,source_name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  return <div className="flex flex-col flex-1">
    <Topbar section="LEARNING" title="Study" />
    <main className="flex-1 p-5 md:p-8 max-w-6xl w-full">
      <div className="mb-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,144,10,.12)", color: "#E8B428" }}><GraduationCap className="w-5 h-5" /></div>
        <div><p className="text-[10px] tracking-[.22em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>YOUR LEARNING WORKSPACE</p><h1 className="text-2xl font-semibold mt-1">Your study space</h1><p className="text-sm mt-1" style={{ color: "rgba(245,240,232,.5)" }}>Organize courses, track deadlines, and plan your next steps.</p></div>
      </div>
      <StudyShell courses={coursesResult.data ?? []} assignments={assignmentsResult.data ?? []} cards={cardsResult.data ?? []} sources={sourcesResult.data ?? []} loadError={Boolean(coursesResult.error || assignmentsResult.error || cardsResult.error || sourcesResult.error)} />
    </main>
  </div>;
}
