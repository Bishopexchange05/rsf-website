import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Writes one row to the append-only audit log for things the app server does
// with the service role. (Role changes and deactivations are logged inside the
// database functions themselves, in the same transaction as the change.)
// Returns false if the row could not be written, so callers can stop.
export async function writeAuditLog(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  detail?: string | null;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("write_audit_log", {
      p_actor_id: entry.actorId,
      p_action: entry.action,
      p_entity_type: entry.entityType,
      p_entity_id: entry.entityId ?? null,
      p_before: entry.before ?? null,
      p_after: entry.after ?? null,
      p_detail: entry.detail ? entry.detail.slice(0, 500) : null,
    });
    if (error) {
      console.error("[audit] could not write:", error.code, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit] could not write:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
