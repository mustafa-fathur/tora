import { localSupabase, TEST_USER } from "./local-supabase";

// Fresh, confirmed test user on the local stack (deleting it removes all its data).
export default async function globalSetup() {
  const { url, serviceKey } = localSupabase();
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const list = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers }).then((r) => r.json());
  for (const u of list.users ?? []) {
    if (u.email === TEST_USER.email) await fetch(`${url}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers });
  }
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...TEST_USER, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`Couldn't create the test user: ${await res.text()}`);
}
