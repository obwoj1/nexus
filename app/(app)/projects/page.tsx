import { FolderKanban } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { ProjectStudio } from "@/components/projects/ProjectStudio";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await createAdminClient().from("nexus_projects")
    .select("id,name,instructions,context,updated_at,created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
  return <div className="flex flex-col flex-1">
    <Topbar section="WORKSPACE" title="Projects" />
    <main className="flex-1 p-5 md:p-8 max-w-6xl w-full">
      <div className="mb-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,144,10,.12)", color: "#E8B428" }}><FolderKanban className="w-5 h-5" /></div>
        <div><p className="text-[10px] tracking-[.22em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>YOUR WORKSPACE</p><h1 className="text-2xl font-semibold mt-1">Project context</h1><p className="text-sm mt-1" style={{ color: "rgba(245,240,232,.5)" }}>Keep project instructions and reference text in Nexus, then optionally include that context in an agent run.</p></div>
      </div>
      <ProjectStudio projects={data ?? []} loadError={Boolean(error)} />
    </main>
  </div>;
}
