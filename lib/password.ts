/**
 * The rules of a new password, as the server states them (ChangePasswordDto): 8 characters at least,
 * one capital, one digit. Said here first so that the person is not sent to the server for a typo.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** What is wrong with a new password, in French, or null when it is acceptable. */
export function newPasswordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";

  return null;
}

/** What is wrong with the three fields of the form, or null when they can be sent. */
export function passwordFormProblem(fields: { current: string; next: string; confirm: string }): string | null {
  if (!fields.current) return "Saisissez votre mot de passe actuel.";

  const weak = newPasswordProblem(fields.next);

  if (weak) return weak;
  if (fields.next === fields.current) return "Le nouveau mot de passe doit être différent de l'actuel.";
  if (fields.next !== fields.confirm) return "La confirmation ne correspond pas au nouveau mot de passe.";

  return null;
}
