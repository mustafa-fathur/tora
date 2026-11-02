import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Settings · Tora" };

export default function SettingsPage() {
  return (
    <ComingSoon phase="G">
      Categories, profile and preferences.
    </ComingSoon>
  );
}
