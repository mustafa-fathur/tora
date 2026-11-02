import Image from "next/image";

import { Button } from "@/components/ui/button";

// Temporary placeholder. Phase E replaces this with a redirect to /login or /dashboard.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Image
        src="/brand/tora-logo.png"
        alt="Tora logo"
        width={120}
        height={120}
        preload
      />
      <h1 className="text-3xl font-semibold tracking-tight text-primary">
        Tora
      </h1>
      <p className="text-muted-foreground">Personal finance, calmly tracked.</p>
      <div className="flex gap-3">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  );
}
