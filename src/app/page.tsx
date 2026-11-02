import { redirect } from "next/navigation";

// proxy.ts already sends "/" to /dashboard or /login. This is only a fallback.
export default function Home() {
  redirect("/login");
}
