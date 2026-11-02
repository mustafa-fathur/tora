import Image from "next/image";
import Link from "next/link";

// Shared frame for login, register, forgot and reset password (based on shadcn login-03).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/login"
          className="flex items-center gap-2 self-center text-lg font-semibold tracking-tight text-primary"
        >
          <Image src="/brand/tora-logo.png" alt="" width={36} height={36} preload />
          Tora
        </Link>
        {children}
      </div>
    </div>
  );
}
