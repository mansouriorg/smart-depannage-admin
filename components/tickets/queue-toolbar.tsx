"use client";

import { Filter, RefreshCcw, Search, X } from "lucide-react";
import { DISPATCH_VIEWS } from "@/lib/shared";
import {
  SORT_OPTIONS,
  URGENCY_OPTIONS,
  filtersChanged,
  statusChoices,
  type QueueFilters,
  type QueueView,
  type Urgency,
} from "@/lib/dispatch";
import type { DispatchSort } from "@/lib/shared";
import { cn } from "@/lib/utils";

interface QueueToolbarProps {
  filters: QueueFilters;
  /** What is typed in the search box (the list follows it a moment after the last key). */
  searchText: string;
  busy: boolean;
  onView: (view: QueueView) => void;
  onStatus: (status: string) => void;
  onUrgency: (urgency: Urgency | "") => void;
  onSort: (sort: DispatchSort) => void;
  onSearchText: (text: string) => void;
  onSearchNow: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

const SELECT =
  "appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-stone-600 shadow-sm transition-all hover:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 cursor-pointer";

/** The tabs of the queue, the search box, the filters and the order. */
export function QueueToolbar({
  filters,
  searchText,
  busy,
  onView,
  onStatus,
  onUrgency,
  onSort,
  onSearchText,
  onSearchNow,
  onReset,
  onRefresh,
}: QueueToolbarProps) {
  const tabs: Array<{ id: QueueView; label: string }> = [...DISPATCH_VIEWS.map((view) => ({ id: view.id as QueueView, label: view.label })), { id: "all", label: "Toutes" }];

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Files de demandes" className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((tab) => {
          const active = filters.view === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => onView(tab.id)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                active ? "border-[#D4AF37] text-blue-950" : "border-transparent text-stone-500 hover:text-blue-950",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchNow();
          }}
          className="relative min-w-0 flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => onSearchText(event.target.value)}
            maxLength={100}
            placeholder="Rechercher : n°, nom, téléphone, e-mail, adresse"
            aria-label="Rechercher une demande"
            className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <select
              aria-label="Statut"
              value={filters.status}
              onChange={(event) => onStatus(event.target.value)}
              className={cn(SELECT, "pl-9")}
            >
              <option value="">Tous les statuts</option>
              {statusChoices(filters.view).map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>

          <select aria-label="Urgence" value={filters.urgency} onChange={(event) => onUrgency(event.target.value as Urgency | "")} className={SELECT}>
            <option value="">Toutes les urgences</option>
            {URGENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select aria-label="Ordre" value={filters.sort} onChange={(event) => onSort(event.target.value as DispatchSort)} className={SELECT}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filtersChanged(filters) && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold text-stone-500 hover:text-red-600">
              <X className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            title="Rafraîchir les données"
            aria-label="Rafraîchir les données"
            className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-600 shadow-sm transition-colors hover:border-[#D4AF37]/50 hover:text-[#B69121] disabled:opacity-50"
          >
            <RefreshCcw className={cn("h-4 w-4", busy && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
}
