// Shared result type for form server actions.
export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const idle: ActionState = { status: "idle" };

export const fail = (message: string): ActionState => ({ status: "error", message });

export const str = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

export const optional = (fd: FormData, name: string) => str(fd, name) || null;

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Turns a Postgres/PostgREST error into something readable.
export function dbErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "That name is already used.";
  if (error.code === "23503") return "Something it refers to no longer exists. Refresh and try again.";
  if (error.code === "23514") return "Some values aren't allowed. Check the form and try again.";
  return "Couldn't save. Please try again.";
}
