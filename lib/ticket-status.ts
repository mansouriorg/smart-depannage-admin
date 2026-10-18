/**
 * The dashboard speaks five statuses (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED,
 * CANCELLED). Giving a job to an artisan (P1-05) can also leave it on ASSIGNED, and the
 * server writes "the artisan accepted" as ARTISAN_ACCEPTED: the dashboard's "Affecté".
 * The rest of the server's vocabulary has its words in the shared package (P1-09):
 * `statusLabel`, `statusTone`, `statusGroupOf`.
 */
export { dashboardStatus } from "@/lib/shared";
