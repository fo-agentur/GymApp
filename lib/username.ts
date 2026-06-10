// Username + password auth on top of Supabase email auth.
// Each username maps deterministically to a synthetic email so no real
// inbox is required. Friends just pick a username and a password.

export const USERNAME_DOMAIN = "gymapp.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  return email.split("@")[0];
}

// Returns an error string if invalid, otherwise null.
export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3) return "Benutzername braucht mindestens 3 Zeichen.";
  if (u.length > 30) return "Benutzername darf höchstens 30 Zeichen haben.";
  if (!/^[a-zA-Z0-9_.]+$/.test(u)) return "Nur Buchstaben, Zahlen, Unterstrich und Punkt.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Passwort braucht mindestens 6 Zeichen.";
  return null;
}
