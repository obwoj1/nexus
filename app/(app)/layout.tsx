import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[60px] min-h-screen">
        {children}
      </div>
    </div>
  );
}
