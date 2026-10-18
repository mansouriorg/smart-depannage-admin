"use client";

import { Calendar, Clock, Eye, MapPin, Phone, RefreshCw, User, UserCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { serviceNameOf } from "@/lib/shared";
import {
  artisanName,
  assignLabel,
  canAssignJob,
  clientName,
  clientPhone,
  statusMovesFor,
  visitTime,
  waitingLabel,
  waitingMinutes,
  type QueueJob,
} from "@/lib/dispatch";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./ticket-status-badge";
import { UrgencyBadge } from "./urgency-badge";

interface TicketTableProps {
  rows: QueueJob[];
  /** The list is being loaded again: what is shown stays, dimmed. */
  refreshing?: boolean;
  /** The moment ages are counted from (the screen renews it every minute). */
  now: number;
  /** The signed-in role may give jobs to technicians. */
  canAssign: boolean;
  /** The signed-in role may change the status of a job. */
  canChange: boolean;
  onAssign: (job: QueueJob) => void;
  onChangeStatus: (job: QueueJob) => void;
  emptyText?: string;
}

const HEADERS = ["Demande", "Client", "Service", "Lieu", "Statut", "Technicien", "Actions"];

function when(value: string | null | undefined, pattern: string): string {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : format(date, pattern, { locale: fr });
}

/** "souhaité le 20 oct. · 09:00–11:00", from the date and the times the customer asked for. */
function wishOf(job: QueueJob): string {
  const day = when(job.preferredDate, "d MMM");

  if (!day) return "";

  const times = job.preferredStartTime ? ` · ${job.preferredStartTime}${job.preferredEndTime ? `–${job.preferredEndTime}` : ""}` : "";

  return `souhaité le ${day}${times}`;
}

export function TicketTable({ rows, refreshing = false, now, canAssign, canChange, onAssign, onChangeStatus, emptyText }: TicketTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-t-xl border border-b-0 border-stone-200 bg-white shadow-xl shadow-stone-200/40">
      <div className={cn("overflow-x-auto transition-opacity", refreshing && "opacity-60")} aria-busy={refreshing}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-100 bg-stone-50">
            <tr>
              {HEADERS.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={cn("px-5 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500", index === HEADERS.length - 1 && "text-right")}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="p-12 text-center text-stone-500">
                  <p>{emptyText ?? "Aucune demande trouvée."}</p>
                </td>
              </tr>
            ) : (
              rows.map((job) => {
                const minutes = waitingMinutes(job.createdAt, now);
                const wish = wishOf(job);
                const phone = clientPhone(job);
                const holder = artisanName(job);
                const showAssign = canAssign && canAssignJob(job);
                const showStatus = canChange && statusMovesFor(job).length > 0;
                const visit = when(visitTime(job), "d MMM HH:mm");

                return (
                  <tr
                    key={job.id}
                    onClick={() => router.push(`/dashboard/tickets/${job.id}`)}
                    className={cn(
                      "group cursor-pointer transition-colors duration-200 hover:bg-[#D4AF37]/5",
                      job.urgency === "EMERGENCY" && "bg-red-50/40",
                    )}
                  >
                    {/* Request: number, urgency, how long it has been waiting */}
                    <td className="px-5 py-4 align-top">
                      <div className="font-bold text-blue-950">n° {job.id}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <UrgencyBadge urgency={String(job.urgency)} />
                      </div>
                      {minutes !== null && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-stone-500" title={when(job.createdAt, "d MMM yyyy HH:mm")}>
                          <Clock className="h-3 w-3" />
                          {minutes < 1 ? "À l'instant" : `Depuis ${waitingLabel(minutes)}`}
                        </div>
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-400 transition-colors group-hover:border-[#D4AF37]/30 group-hover:text-[#B69121]">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-blue-950 transition-colors group-hover:text-[#B69121]">{clientName(job)}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-stone-400">
                            <Phone className="h-3 w-3 text-[#D4AF37]" />
                            <span>{phone || "Non renseigné"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-5 py-4 align-top">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                        <Wrench className="h-3 w-3 text-[#D4AF37]" />
                        {serviceNameOf(job.serviceType)}
                      </span>
                      {job.subService?.name && <div className="mt-1 max-w-[160px] truncate text-xs text-stone-400">{job.subService.name}</div>}
                    </td>

                    {/* Place and wished time */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-1.5 font-medium text-stone-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                        <span className="max-w-[200px] truncate" title={job.address}>
                          {job.address}
                        </span>
                      </div>
                      {wish && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{wish}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 align-top">
                      <TicketStatusBadge status={job.status} />
                    </td>

                    {/* Technician */}
                    <td className="px-5 py-4 align-top">
                      {holder ? (
                        <>
                          <div className="font-medium text-stone-700">{holder}</div>
                          {visit && <div className="mt-0.5 text-xs text-stone-400">Passage le {visit}</div>}
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">Personne</span>
                      )}
                    </td>

                    {/* Actions: the click on a button must not open the job */}
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        {showAssign && (
                          <button
                            type="button"
                            onClick={() => onAssign(job)}
                            aria-label={`${assignLabel(job)} : demande n° ${job.id}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                              job.artisanId
                                ? "border border-stone-200 bg-white text-stone-600 hover:border-[#D4AF37] hover:text-[#B69121]"
                                : "bg-gradient-to-r from-[#D4AF37] to-[#B69121] text-white shadow-sm hover:brightness-110",
                            )}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {assignLabel(job)}
                          </button>
                        )}

                        {showStatus && (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(job)}
                            aria-label={`Changer le statut : demande n° ${job.id}`}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 transition-colors hover:border-[#D4AF37] hover:text-[#B69121]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Statut
                          </button>
                        )}

                        <Link
                          href={`/dashboard/tickets/${job.id}`}
                          className="rounded-lg p-2 text-stone-400 transition-colors group-hover:bg-[#D4AF37]/10 group-hover:text-[#B69121]"
                          title="Voir le dossier"
                          aria-label={`Voir le dossier de la demande ${job.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
