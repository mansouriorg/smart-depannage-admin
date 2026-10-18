"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { endSession } from "@/lib/auth";
import { loadSession, saveUser, toStaffUser, type StaffUser } from "@/lib/session";
import {
  canOpenDashboardPath,
  dashboardHomeFor,
  staffCan,
  staffRoleOf,
  type ActionId,
  type StaffRole,
} from "@/lib/shared";

/**
 * Who is signed in, for the menu, the header and the buttons (P1-12).
 *
 * It reads the account kept at sign-in, shows the dashboard at once, and asks the server who the
 * account is now (GET /users/me): a person renamed, given another role or switched off since the
 * sign-in is seen as such within a page load. A page is built only when the role may open it; the
 * proxy has already sent the other roles away, this is the same rule for the moves that never
 * reach the server (a link followed in the page).
 */
interface StaffState {
  /** False until the stored session has been read (the first render has none: it is made on the server). */
  ready: boolean;
  user: StaffUser | null;
  role: StaffRole | null;
  /** True when the role may do this: the buttons that the API would refuse are not shown. */
  can: (action: ActionId) => boolean;
  /** The account after the person changed it in their settings. */
  update: (user: StaffUser) => void;
}

const StaffContext = createContext<StaffState>({
  ready: false,
  user: null,
  role: null,
  can: () => false,
  update: () => undefined,
});

export function useStaff(): StaffState {
  return useContext(StaffContext);
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    const session = loadSession();

    // The marker said "signed in" but the browser has no tokens (storage cleared): there is no session.
    // (endSession forgets what is left, and tells the sign-in page that the session ended.)
    if (!session || !staffRoleOf(session.user.role)) {
      endSession({ expired: true });
      return;
    }

    setUser(session.user);
    setReady(true);

    let stopped = false;

    api
      .get("/users/me")
      .then((answer) => {
        const fresh = toStaffUser(answer.data);

        if (stopped || !fresh) return;

        // An account that is not staff any more: nothing of the dashboard is for it.
        if (saveUser(fresh) === null) {
          endSession();
          return;
        }

        setUser(fresh);
      })
      .catch(() => {
        // A 401 has been dealt with by the client (refresh, or back to the sign-in page); other failures
        // (offline) leave the dashboard as the sign-in described it.
      });

    return () => {
      stopped = true;
    };
  }, []);

  const role = staffRoleOf(user?.role);
  const value = useMemo<StaffState>(
    () => ({
      ready,
      user,
      role,
      can: (action) => staffCan(role, action),
      update: (next) => {
        if (saveUser(next) !== null) setUser(next);
      },
    }),
    [ready, user, role],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

/**
 * Builds the page only for a role that may open it. Until then (and while a role that may not is
 * sent to the first page of its own menu) it shows a spinner, so that the page does not start calls
 * that the API would refuse.
 */
export function PageGate({ children }: { children: ReactNode }) {
  const { ready, role } = useStaff();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = ready && canOpenDashboardPath(role, pathname);

  useEffect(() => {
    if (ready && !allowed) router.replace(dashboardHomeFor(role));
  }, [ready, allowed, role, router]);

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
