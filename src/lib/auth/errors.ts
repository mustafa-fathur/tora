import type { AuthError } from "@supabase/supabase-js";

// Turns Supabase Auth errors into short, friendly messages.
// Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed:
    "Please confirm your email first. Check your inbox for the link.",
  user_already_exists: "An account with this email already exists. Try logging in.",
  email_exists: "An account with this email already exists. Try logging in.",
  weak_password: "That password is too weak. Use at least 10 characters.",
  same_password: "Your new password must be different from the current one.",
  over_email_send_rate_limit:
    "Too many emails sent. Please wait a few minutes and try again.",
  over_request_rate_limit:
    "Too many attempts. Please wait a few minutes and try again.",
  signup_disabled: "New sign-ups are closed.",
  mfa_verification_failed: "That code didn't work. Check your authenticator app and try again.",
  mfa_challenge_expired: "That took too long. Enter a fresh code.",
  mfa_factor_name_conflict: "An authenticator with that name already exists.",
  mfa_totp_enroll_not_enabled: "Two-factor login isn't enabled for this project yet.",
  mfa_totp_verify_not_enabled: "Two-factor login isn't enabled for this project yet.",
  insufficient_aal: "Enter your two-factor code first.",
};

export function authErrorMessage(error: AuthError): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.name === "AuthRetryableFetchError") {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

// Messages for ?error=… on /login, set by the email-link handler.
export const LINK_ERRORS: Record<string, string> = {
  link_invalid:
    "That link is invalid or has expired. Please request a new one.",
};

export const MIN_PASSWORD_LENGTH = 10;
