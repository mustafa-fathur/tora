import { Construction } from "lucide-react";

// Placeholder for sections that aren't built yet.
export function ComingSoon({ phase, children }: { phase: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Construction className="size-8 text-muted-foreground" aria-hidden />
      <p className="max-w-md text-muted-foreground">{children}</p>
      <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
        Coming in phase {phase}
      </span>
    </div>
  );
}
