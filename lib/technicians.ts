import { positionFlag, type PositionFlag } from "@/lib/shared";

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

/**
 * The flag shown next to a technician's position (P3-05), or null when nothing is to be shown: `quiet` leaves out a position that is up to date
 * (a list in which every row says so is noise; the assign dialog is quiet, the technicians page is not).
 */
export function positionBadgeOf(
  state: string | null | undefined,
  ageMinutes: number | null | undefined,
  quiet = false,
): PositionFlag | null {
  const flag = positionFlag(state, ageMinutes);

  return quiet && flag.state === "fresh" ? null : flag;
}

/**
 * Whether the phone of this technician is expected to be sending its position (P3-05): the account is active and the technician is online or
 * busy, or has a job on the way, arrived or at work (the phone sends for that job whatever the switch says). A phone sends only in front and
 * while the technician is at work, so for the others "sans nouvelles" is the normal state and not an alarm; a list in which every offline
 * technician is amber hides the one who really went quiet. A profile that does not say is treated as at work (the flag is better shown than hidden).
 */
export function positionIsExpected(tech: { isActive?: boolean | null; hasJobUnderWay?: boolean | null; artisanProfile?: { availabilityStatus?: string | null } | null }): boolean {
  if (tech.isActive === false) return false;
  if (tech.hasJobUnderWay === true) return true;

  const status = tech.artisanProfile?.availabilityStatus;

  return status === undefined || status === null || status === "ONLINE" || status === "BUSY";
}

/**
 * A technician who is expected to be sending a position and has none at all (P3-05): the phone never sent one (the location was refused, or the app
 * was never opened at work). That is the loudest silence there is, so it is flagged like the others; a technician who is not expected to send is not.
 */
export function noPositionYet(tech: {
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean | null;
  hasJobUnderWay?: boolean | null;
  artisanProfile?: { availabilityStatus?: string | null } | null;
}): boolean {
  return positionIsExpected(tech) && !(tech.latitude && tech.longitude);
}
