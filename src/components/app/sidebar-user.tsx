import { LogOut } from "lucide-react";
import { connection } from "next/server";

import { logout } from "@/app/(auth)/actions";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

// Signed-in email + log out, at the bottom of the sidebar. Render inside <Suspense>.
export async function SidebarUser() {
  await connection(); // request-time only (Supabase uses Date.now())
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email ?? "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="truncate px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden" title={email}>
          {email}
        </div>
        <form action={logout}>
          <SidebarMenuButton type="submit" tooltip="Log out">
            <LogOut />
            <span>Log out</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
