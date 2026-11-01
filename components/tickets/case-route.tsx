"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, MapPinned, Pause, Play, Route } from "lucide-react";

import api, { apiErrorMessage } from "@/lib/api";
import {
  callApi,
  drawRoute,
  momentLabel,
  replayDetails,
  replayFrame,
  routeClock,
  routeFacts,
  routeNotes,
  routes,
  type JobRoute,
} from "@/lib/shared";
import { cn } from "@/lib/utils";

/** The replay moves to the next position this often, at the normal speed. */
const PLAY_STEP_MS = 350;

/** The speeds of the replay: a route of two thousand positions takes twelve minutes at the first. */
const SPEEDS = [1, 4, 16] as const;

const WIDTH = 600;
const HEIGHT = 360;
/** A thin outline in the colour of the plan, so that a word stays readable where the line of the route passes under it. */
const HALO = { stroke: "#fafaf9", strokeWidth: 3, paintOrder: "stroke" } as const;

/**
 * Where the technician went on a job, for a dispute (P3-05). Nothing is read until the button is pressed: a case file is opened many times
 * for a reason that has nothing to do with the route, and the route is the technician's personal data.
 *
 * The drawing is a plan, not a map: north is up, a metre is the same length both ways, and the address is marked. The scrubber and the play
 * button move through the positions in the order they were sent; the moments of the job (set out, arrived, work started and finished) are
 * ticked as they pass.
 *
 * A route is one technician's. When the job changed hands the route shown is the one of the technician who holds it (or sent the latest
 * positions); the others who sent positions are listed and each opens with one press.
 */
export function CaseRoute({ jobId }: { jobId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [route, setRoute] = useState<JobRoute | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const asked = useRef(0);
  // Whose route was asked for: nobody in particular at first, then the one that was pressed; "read again" reads the same one.
  const wanted = useRef<number | null>(null);

  // Another job is another route: nothing of the previous one stays on the screen.
  useEffect(() => {
    asked.current += 1;
    wanted.current = null;
    setState("idle");
    setRoute(null);
    setProblem(null);
    setIndex(0);
    setPlaying(false);
  }, [jobId]);

  const load = async (artisanId: number | null = wanted.current) => {
    const mine = (asked.current += 1);

    wanted.current = artisanId;

    setState("loading");
    setProblem(null);
    setPlaying(false);

    try {
      const answer = await callApi((config) => api.request(config), routes.admin.interventionRoute(jobId, artisanId ?? undefined));

      if (mine !== asked.current) return;

      setRoute(answer);
      setIndex(0);
      setState("ready");
    } catch (error) {
      if (mine !== asked.current) return;

      setProblem(apiErrorMessage(error, "Le parcours n’a pas pu être lu."));
      setState("failed");
    }
  };

  const count = route?.points.length ?? 0;

  useEffect(() => {
    if (!playing) return;

    if (index >= count - 1) {
      setPlaying(false);

      return;
    }

    const timer = setTimeout(() => setIndex((current) => Math.min(current + 1, count - 1)), PLAY_STEP_MS / speed);

    return () => clearTimeout(timer);
  }, [playing, index, count, speed]);

  const drawing = useMemo(() => (route ? drawRoute(route, WIDTH, HEIGHT) : null), [route]);
  const frame = route ? replayFrame(route, index) : null;
  const here = drawing && frame?.point ? drawing.points[frame.index] : null;

  return (
    <div className="space-y-4">
      {(state === "idle" || state === "failed") && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Les positions envoyées par le téléphone du technicien pendant le trajet et le travail. Ce sont des données personnelles du technicien :
            à consulter pour un litige.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-blue-950 hover:border-[#D4AF37] hover:text-[#B69121]"
          >
            <Route className="h-4 w-4" /> Afficher le parcours
          </button>
          {problem && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problem}
            </p>
          )}
        </div>
      )}

      {state === "loading" && (
        <p className="flex items-center gap-2 text-sm text-stone-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Lecture du parcours…
        </p>
      )}

      {state === "ready" && route && (
        <>
          {route.artisan && (
            <p className="text-sm text-stone-600">
              Technicien : <span className="font-semibold text-blue-950">{route.artisan.name}</span>
              {!route.artisan.current && <span className="text-stone-500"> (n’a plus cette intervention)</span>}
            </p>
          )}

          {/* A job that changed hands: the other technicians who sent positions, one press each. */}
          {route.others.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Autres techniciens ayant envoyé des positions">
              {route.others.map((other) => (
                <li key={other.artisan.id}>
                  <button
                    type="button"
                    onClick={() => void load(other.artisan.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-blue-950 hover:border-[#D4AF37]"
                  >
                    <Route className="h-3.5 w-3.5" /> Voir le trajet de {other.artisan.name || "l’autre technicien"} ({other.pointCount} position{other.pointCount > 1 ? "s" : ""})
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-1.5">
            {routeNotes(route).map((note) => (
              <li key={note} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {note}
              </li>
            ))}
          </ul>

          {routeFacts(route).length > 0 && (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {routeFacts(route).map((fact) => (
                <div key={fact.label} className="min-w-0 rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
                  <dt className="text-xs text-stone-500">{fact.label}</dt>
                  <dd className="break-words font-semibold text-blue-950">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {drawing && count > 0 && frame && (
            <div className="space-y-3">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full rounded-lg border border-stone-200 bg-stone-50"
                role="img"
                aria-label={`Plan du parcours : ${count} position${count > 1 ? "s" : ""}${route.destination ? ", adresse repérée" : ""}. Nord en haut.`}
              >
                <polyline points={drawing.line} fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* the part already travelled at this point of the replay */}
                <polyline
                  points={drawing.points.slice(0, frame.index + 1).map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={drawing.points[0].x} cy={drawing.points[0].y} r="5" fill="#16a34a" />
                {drawing.destination && (
                  <g>
                    <rect x={drawing.destination.x - 6} y={drawing.destination.y - 6} width="12" height="12" fill="#dc2626" transform={`rotate(45 ${drawing.destination.x} ${drawing.destination.y})`} />
                    {/* On the right edge of the plan the word goes to the left of the mark, or it would be cut. */}
                    <text
                      x={drawing.destination.x > WIDTH - 80 ? drawing.destination.x - 11 : drawing.destination.x + 11}
                      y={drawing.destination.y + 4}
                      textAnchor={drawing.destination.x > WIDTH - 80 ? "end" : "start"}
                      fontSize="12"
                      fill="#7f1d1d"
                      {...HALO}
                    >
                      Adresse
                    </text>
                  </g>
                )}
                {here && <circle cx={here.x} cy={here.y} r="7" fill="#D4AF37" stroke="#ffffff" strokeWidth="2" />}
                <text x="14" y="22" fontSize="12" fill="#6b7280" {...HALO}>N ↑</text>
                {drawing.scale && (
                  <g>
                    <line x1={WIDTH - 24 - drawing.scale.length} y1={HEIGHT - 18} x2={WIDTH - 24} y2={HEIGHT - 18} stroke="#6b7280" strokeWidth="2" />
                    <text x={WIDTH - 24 - drawing.scale.length} y={HEIGHT - 24} fontSize="11" fill="#6b7280" {...HALO}>{drawing.scale.label}</text>
                  </g>
                )}
              </svg>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // At the end, play starts again from the beginning.
                    if (!playing && index >= count - 1) setIndex(0);

                    setPlaying((current) => !current);
                  }}
                  disabled={count < 2}
                  aria-label={playing ? "Mettre en pause" : "Lire le parcours"}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-blue-950 hover:border-[#D4AF37] disabled:opacity-40"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, count - 1)}
                  value={frame.index}
                  onChange={(event) => {
                    setPlaying(false);
                    setIndex(Number(event.target.value));
                  }}
                  disabled={count < 2}
                  aria-label="Position dans le parcours"
                  aria-valuetext={`Position ${frame.index + 1} sur ${count}, ${routeClock(route, frame.point?.at)}`}
                  className="w-full accent-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setSpeed((current) => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length])}
                  disabled={count < 2}
                  aria-label={`Vitesse de lecture : ×${speed}. Changer.`}
                  className="h-10 shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-blue-950 hover:border-[#D4AF37] disabled:opacity-40"
                >
                  ×{speed}
                </button>
              </div>

              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {replayDetails(route, frame.index).map((detail) => (
                  <div key={detail.label} className="flex justify-between gap-3 border-b border-stone-100 pb-1">
                    <dt className="text-stone-500">{detail.label}</dt>
                    <dd className="font-medium text-blue-950">{detail.value}</dd>
                  </div>
                ))}
              </dl>

              {frame.point && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${frame.point.latitude},${frame.point.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  <MapPinned className="h-4 w-4" /> Voir cette position sur la carte <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {route.moments.length > 0 && (
            <ol className="space-y-1 text-sm" aria-label="Étapes de l’intervention">
              {route.moments.map((moment) => {
                // With no position there is no replay to be at the middle of: the moments are what happened, all of them.
                const passed = count === 0 || (frame?.point ? frame.moments.some((reached) => reached.type === moment.type && reached.at === moment.at) : false);

                return (
                  <li key={`${moment.type}-${moment.at}`} className={cn("flex justify-between gap-3", passed ? "font-semibold text-blue-950" : "text-stone-500")}>
                    <span>
                      {momentLabel(moment.type)}
                      {!passed && <span className="sr-only"> (pas encore atteint à cette position)</span>}
                    </span>
                    <span>{routeClock(route, moment.at)}</span>
                  </li>
                );
              })}
            </ol>
          )}

          <button
            type="button"
            onClick={() => void load(wanted.current)}
            className="text-xs font-medium text-stone-500 underline hover:text-blue-950"
          >
            Relire le parcours
          </button>
        </>
      )}
    </div>
  );
}
