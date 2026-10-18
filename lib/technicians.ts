/**
 * The rating of a technician as the card shows it (P1-12). The card used to say "5.0" for everybody.
 *
 * Two real figures exist: the average of the reviews a moderator approved (the profile's rating, which
 * is also what the matching uses), and the average of what customers answered after their jobs. The
 * first one wins when there is one ("4.5 (12 avis)"); until then the second is shown for what it is
 * ("4.2 (3 retours)"); "Pas encore noté" when there is neither.
 */
export function ratingLabel(
  profile: { averageRating?: number | null; ratingCount?: number | null } | null | undefined,
  feedback?: { average?: number | null; count?: number | null } | null,
): string {
  const count = Number(profile?.ratingCount ?? 0);
  const average = Number(profile?.averageRating ?? 0);

  if (Number.isFinite(count) && Number.isFinite(average) && count >= 1) return `${average.toFixed(1)} (${count} avis)`;

  const answers = Number(feedback?.count ?? 0);
  const mean = Number(feedback?.average ?? Number.NaN);

  if (Number.isFinite(answers) && Number.isFinite(mean) && answers >= 1) return `${mean.toFixed(1)} (${answers} ${answers === 1 ? "retour" : "retours"})`;

  return "Pas encore noté";
}
