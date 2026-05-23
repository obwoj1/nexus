import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />
      {/* md: offset for desktop sidebar, pb for mobile bottom nav */}
      <div className="flex-1 flex flex-col md:ml-[60px] pb-[60px] md:pb-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}
