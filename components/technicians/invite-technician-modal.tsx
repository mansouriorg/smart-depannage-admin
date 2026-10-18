"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, MailPlus, X } from "lucide-react";
import api, { apiErrorMessage, unwrapList } from "@/lib/api";
import { PasswordLinkDialog } from "@/components/password-link-dialog";
import { TRADE_LIST } from "@/lib/shared";

interface InviteTechnicianModalProps {
  onSuccess: () => void;
}

interface ZoneChoice {
  id: number;
  name: string;
  city: string | null;
}

/**
 * "Add technician" (P1-11): the back office vouches for someone and invites them. The account is
 * made at once and approved, with the trades and zones chosen here, and the artisan receives a
 * single-use link (24 h) to choose a password. While no mail server is configured the answer
 * carries that link, shown to the staff member to hand over.
 */
export function InviteTechnicianModal({ onSuccess }: InviteTechnicianModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [zones, setZones] = useState<ZoneChoice[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesFailed, setZonesFailed] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "", yearsExperience: "0" });
  // The first trade picked is the main one.
  const [trades, setTrades] = useState<string[]>([]);
  const [zoneIds, setZoneIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen || zonesLoaded) return;

    let cancelled = false;

    setZonesFailed(false);

    api
      .get<ZoneChoice[]>("/service-zones")
      .then((response) => {
        if (cancelled) return;

        setZones(unwrapList<ZoneChoice>(response.data));
        setZonesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setZonesFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, zonesLoaded]);

  const reset = () => {
    setForm({ name: "", email: "", phone: "", yearsExperience: "0" });
    setTrades([]);
    setZoneIds([]);
    setError(null);
    setSentTo(null);
  };

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trades.length) {
      setError("Choisissez au moins un métier.");

      return;
    }

    const years = Number(form.yearsExperience);

    if (!Number.isInteger(years) || years < 0 || years > 60) {
      setError("Les années d’expérience doivent être un nombre entier entre 0 et 60.");

      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post("/admin/artisans", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        specialty: trades[0],
        specialties: trades,
        yearsExperience: years,
        zoneIds,
      });

      onSuccess();

      // While no mail server is configured the answer carries the one-time link.
      if (res.data?.passwordSetupUrl) {
        setSetupUrl(res.data.passwordSetupUrl);
        close();
      } else {
        setSentTo(form.email.trim());
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Une erreur est survenue lors de l’invitation."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {setupUrl && (
        <PasswordLinkDialog url={setupUrl} title="Invitation créée : lien pour l'artisan" onClose={() => setSetupUrl(null)} />
      )}

      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center rounded-lg border-t border-[#F3DFA2]/30 bg-[#D4AF37] px-4 py-2.5 font-bold text-white shadow-md shadow-[#D4AF37]/20 transition-all hover:bg-[#B69121]"
      >
        <MailPlus className="mr-2 h-4 w-4" /> Inviter
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-blue-950">
                <MailPlus className="h-5 w-5 text-[#D4AF37]" />
                Inviter un technicien
              </h2>
              <button onClick={close} className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sentTo ? (
              <div className="space-y-4 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-sm text-stone-600">
                  Invitation envoyée à <strong>{sentTo}</strong>. Le technicien choisit son mot de passe avec le lien reçu (valable 24 heures, usage unique).
                </p>
                <button onClick={close} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {error && <div className="whitespace-pre-line rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Nom complet</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-stone-700">Adresse e-mail</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                      placeholder="jean.dupont@email.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-stone-700">Téléphone</label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                      placeholder="20 123 456"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">
                    Métiers <span className="font-normal text-stone-400">(le premier choisi est le principal)</span>
                  </label>
                  {/* The trades are the server's table (P1-10): a word it does not know is refused. */}
                  <div className="flex flex-wrap gap-2">
                    {TRADE_LIST.map((trade) => {
                      const on = trades.includes(trade.label);
                      const rank = trades.indexOf(trade.label);

                      return (
                        <button
                          type="button"
                          key={trade.code}
                          onClick={() => setTrades((prev) => toggle(prev, trade.label))}
                          aria-pressed={on}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            on ? "border-blue-950 bg-blue-950 text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          {on && rank === 0 ? "★ " : ""}
                          {trade.code === "AUTRE" ? "Polyvalent" : trade.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Années d’expérience</label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={60}
                    step={1}
                    value={form.yearsExperience}
                    onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
                    className="w-32 rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">
                    Zones d’intervention <span className="font-normal text-stone-400">(aucune : pas de limite de lieu)</span>
                  </label>

                  {zonesFailed ? (
                    <p className="text-xs text-red-600">Impossible de charger la liste des zones.</p>
                  ) : !zonesLoaded ? (
                    <p className="flex items-center gap-2 text-xs text-stone-400"><Loader2 className="h-3 w-3 animate-spin" /> Chargement…</p>
                  ) : !zones.length ? (
                    <p className="text-xs text-amber-700">Aucune zone n’est proposée pour le moment : le technicien ne sera limité à aucun lieu.</p>
                  ) : (
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-stone-100 p-2">
                      {zones.map((zone) => {
                        const on = zoneIds.includes(zone.id);

                        return (
                          <button
                            type="button"
                            key={zone.id}
                            onClick={() => setZoneIds((prev) => toggle(prev, zone.id))}
                            aria-pressed={on}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              on ? "border-[#B69121] bg-[#D4AF37] text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                          >
                            {zone.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-lg border border-stone-200 px-4 py-2 font-medium text-stone-600 transition-colors hover:bg-stone-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2 font-medium text-white transition-colors hover:bg-[#B69121] disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Envoi…" : "Envoyer l’invitation"}
                  </button>
                </div>

                <p className="text-center text-xs text-stone-400">
                  Le technicien reçoit un lien à usage unique (valable 24 h) pour choisir son mot de passe. Il est approuvé dès l’invitation.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
