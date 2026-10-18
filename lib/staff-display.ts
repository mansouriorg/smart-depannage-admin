/** How an account is written in the header and the settings: its name, else its e-mail address. */
export function displayName(user: { name?: string | null; email: string } | null | undefined): string {
  return user?.name?.trim() || user?.email || "";
}

/** The first letter of the name (or of the e-mail address when the account has no name), in capitals. */
export function initialOf(user: { name?: string | null; email: string } | null | undefined): string {
  const text = displayName(user).trim();

  return text ? text.charAt(0).toUpperCase() : "?";
}

/** A date from the server, written in French ("12 mars 2026"); `fallback` when there is none or it is not a date. */
export function frenchDate(value: string | null | undefined, fallback = ""): string {
  const time = value ? new Date(value) : null;

  if (!time || Number.isNaN(time.getTime())) return fallback;

  return time.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" });
}
