import { useEffect, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { audit } from "../../lib/api";
import { formatAuditAction } from "./settingsHelpers";

export default function AuditLogPage() {
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditAction, setAuditAction] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);

  useEffect(() => {
    setAuditLoading(true);

    void audit.list({
      action: auditAction || undefined,
      entity_type: auditEntityType || undefined,
      from: auditFrom ? new Date(`${auditFrom}T00:00:00.000Z`).toISOString() : undefined,
      to: auditTo ? new Date(`${auditTo}T23:59:59.999Z`).toISOString() : undefined,
      page: auditPage,
      limit: 20,
    }).then((response) => {
      setAuditEntries((prev) => (auditPage === 1 ? response.entries : [...prev, ...response.entries]));
      setAuditHasMore(response.pagination.hasNext);
      setAuditLoading(false);
    }).catch(() => {
      setAuditEntries((prev) => (auditPage === 1 ? [] : prev));
      setAuditHasMore(false);
      setAuditLoading(false);
    });
  }, [auditAction, auditEntityType, auditFrom, auditTo, auditPage]);

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Track account and integration activity" />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <section className="settings-section">
            <h3>Audit Log</h3>
            <div className="settings-audit-filters">
              <input
                className="dl-filter-input"
                placeholder="Action"
                value={auditAction}
                onChange={(event) => {
                  setAuditAction(event.target.value);
                  setAuditPage(1);
                }}
              />
              <input
                className="dl-filter-input"
                placeholder="Entity type"
                value={auditEntityType}
                onChange={(event) => {
                  setAuditEntityType(event.target.value);
                  setAuditPage(1);
                }}
              />
              <input
                className="dl-filter-input"
                type="date"
                value={auditFrom}
                onChange={(event) => {
                  setAuditFrom(event.target.value);
                  setAuditPage(1);
                }}
              />
              <input
                className="dl-filter-input"
                type="date"
                value={auditTo}
                onChange={(event) => {
                  setAuditTo(event.target.value);
                  setAuditPage(1);
                }}
              />
            </div>

            <div className="settings-list">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="settings-list-item settings-audit-item">
                  <div>
                    <strong>{formatAuditAction(entry.action)}</strong>
                    <p>{entry.entity_type} {entry.entity_id ? `(${entry.entity_id})` : ""}</p>
                  </div>
                  <span className="dl-cell-time" title={new Date(entry.created_at).toLocaleString()}>
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {!auditLoading && auditEntries.length === 0 ? <p>No audit entries found.</p> : null}
            </div>

            {auditHasMore ? (
              <button
                type="button"
                className="auth-btn auth-btn-secondary"
                onClick={() => setAuditPage((value) => value + 1)}
                disabled={auditLoading}
              >
                {auditLoading ? "Loading..." : "Load more"}
              </button>
            ) : null}
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
