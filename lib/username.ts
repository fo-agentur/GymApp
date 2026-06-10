// Username + password auth on top of Supabase email auth.
// Each username maps deterministically to a synthetic email so no real
// inbox is required. Friends just pick a username and a password.

export const USERNAME_DOMAIN = "gymapp.local";

export function usernameToEmail(username: string): string {
  const name = username.trim().toLowerCase();
  // If the user typed a full e-mail address, keep only the local part.
  const localPart = name.includes("@") ? name.split("@")[0] : name;
  return `${localPart}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  return email.split("@")[0];
}

// Returns an error string if invalid, otherwise null.
export function validateUsername(username: string): string | null {
  const raw = username.trim();
  // Accept full e-mail addresses — validate only the local part.
  const u = raw.includes("@") ? raw.split("@")[0] : raw;
  if (u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 30) return "Username must be at most 30 characters.";
  if (!/^[a-zA-Z0-9_.]+$/.test(u)) return "Only letters, numbers, underscore and dot.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}
