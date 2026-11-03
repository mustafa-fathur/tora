import { getEverything } from "@/lib/data/queries";
import { today } from "@/lib/finance/dates";

// All of the signed-in user's data as one JSON file (a personal copy, not a database backup).
export async function GET() {
  const data = await getEverything();
  const body = JSON.stringify({ app: "Tora", format: 1, exported_at: new Date().toISOString(), ...data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tora-export-${today()}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
