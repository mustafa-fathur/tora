import { Suspense } from "react";

import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarUser } from "@/components/app/sidebar-user";
import { QuickAddTransaction } from "@/components/transactions/quick-add";
import { SidebarInset, SidebarMenuSkeleton, SidebarProvider } from "@/components/ui/sidebar";

// Shell for every signed-in page. proxy.ts already guarantees a session here.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        user={
          <Suspense fallback={<SidebarMenuSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        <AppHeader
          actions={
            <Suspense fallback={null}>
              <QuickAddTransaction />
            </Suspense>
          }
        />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
