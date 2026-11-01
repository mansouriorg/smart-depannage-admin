This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Technician position and route replay (P3-05)

- **Technicians** page and the **assignment** dialog show a flag next to the position of a technician (`components/technicians/position-badge.tsx`): "Position à jour · il y a 2 min",
  "Sans nouvelles · depuis 25 min" (no news from the phone for the limit set on the server, 10 minutes by default) or "Position non datée" (coordinates with no time: never sent, or sent before the time was kept).
  The Technicians page shows the flag **only for an active account that is online or busy, or has a job on the way, arrived or at work** (`positionIsExpected`, with `hasJobUnderWay` from the list): a phone sends nothing for a technician who is offline with no job, so an amber flag on every offline account would hide the one who really went quiet.
  An expected technician whose phone **never sent a position at all** (location refused, app never opened at work) is flagged "Aucune position reçue" (the loudest silence there is).
  The flag is worked out by the server **when the list is read**, so the page reads it again every minute while the tab is in front (and when the person comes back to it, never more often than every 30 seconds, counted from the start of a reading, a failed one included) and says at what time the list was updated; a page left open would otherwise keep saying "à jour" for hours.
  A reading that fails says so over the list that is still shown (it keeps the time of the last good one). The pages of the list are read up to 2,000 technicians, the most recent ones (a notice says so beyond); a page that does not answer within 20 seconds is given up and said so, rather than leaving the badges as they were; a technician seen twice because the pages moved is kept once; a reading that began before a deactivation or an invitation made on the page is dropped and made again, so it cannot bring the old rows back.
  The assignment dialog only says it when the position is **not** up to date, because the distance and the arrival time it shows are measured from that position. The flag never changes the score.
- **Case file** → "Parcours du technicien" (`components/tickets/case-route.tsx`), for a dispute: nothing is read until the button is pressed. It shows a plan (north up, the address marked), a slider and a play button over the positions,
  the moments of the job, how close the technician came to the address and how far from it they were when they said they had arrived, and the warnings that matter before concluding
  (no position kept, a job older than the retention, a route cut at 2,000 positions (the figures are then those of the first 2,000, and the panel says so), a phone that was closed). The positions are kept for 7 days (a setting of the server), longer while a complaint is open.
  A deactivated account is never flagged, even when a job is still on the way for it (its phone is signed out, so it is silent: reassign the job). Reading a route is not written in the audit log (an open decision; the panel does not say either way). The play button has three speeds (×1, ×4, ×16: 2,000 positions take 12 minutes at ×1).
  **A route is one technician's.** When the job changed hands the panel shows the technician who holds it (or, when nobody does, the one who sent the latest positions), says when that technician no longer has the job,
  and offers a button for each other technician who sent positions. The panel is offered when a technician holds the job **or the timeline says one set out**, so a job set out on and then given back can still be replayed.
  Times carry their date when the route crosses midnight.
