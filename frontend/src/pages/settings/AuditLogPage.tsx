import {
  Activity,
  Cloud,
  Download,
  Folder,
  Github,
  Layers,
  LucideIcon,
  Rocket,
  ScrollText,
  Search,
  Shield,
  UserCircle2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { AuditLogEntry, audit } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

type ActionCategory = "account" | "github" | "aws" | "repo" | "environment" | "deployment" | "security" | "gray";
type ActionColorTone = "blue" | "green" | "red" | "amber" | "purple" | "gray";

type ActionDescriptor = {
  label: string;
  icon: string;
  category: ActionCategory;
  color: ActionColorTone;
};

type ActionResolved = ActionDescriptor & {
  key: string;
};

type DecoratedEntry = {
  entry: AuditLogEntry;
  action: ActionResolved;
  dateKey: string;
  entityBadge: string;
  metadataContext: string | null;
};

type GroupedEntries = {
  key: string;
  header: string;
  entries: DecoratedEntry[];
};

type CategoryPalette = {
  bg: string;
  text: string;
  border: string;
};

const ACTION_LABELS: Record<string, ActionDescriptor> = {
  "account.name_changed": { label: "Name updated", icon: "UserCircle2", category: "account", color: "blue" },
  "account.password_changed": { label: "Password changed", icon: "Shield", category: "security", color: "amber" },
  "account.deleted": { label: "Account deleted", icon: "UserCircle2", category: "account", color: "red" },
  "github.connected": { label: "GitHub connected", icon: "Github", category: "github", color: "green" },
  "github.disconnected": { label: "GitHub disconnected", icon: "Github", category: "github", color: "red" },
  "aws.connected": { label: "AWS connected", icon: "Cloud", category: "aws", color: "green" },
  "aws.disconnected": { label: "AWS disconnected", icon: "Cloud", category: "aws", color: "red" },
  "repo.tracked": { label: "Repository added", icon: "Folder", category: "repo", color: "green" },
  "repo.untracked": { label: "Repository disabled", icon: "Folder", category: "repo", color: "amber" },
  "repo.webhook_secret_viewed": { label: "Webhook secret viewed", icon: "Shield", category: "security", color: "amber" },
  "environment.created": { label: "Environment created", icon: "Layers", category: "environment", color: "green" },
  "environment.updated": { label: "Environment updated", icon: "Layers", category: "environment", color: "blue" },
  "environment.deleted": { label: "Environment deleted", icon: "Layers", category: "environment", color: "red" },
  "deployment.rollback_triggered": { label: "Rollback triggered", icon: "Rocket", category: "deployment", color: "red" },
  "deployment.rerun_triggered": { label: "Workflow re-run triggered", icon: "Rocket", category: "deployment", color: "blue" },
  "deployment.promoted": { label: "Deployment promoted", icon: "Rocket", category: "deployment", color: "purple" },
  "deployment.synced": { label: "Deployment synced", icon: "Activity", category: "deployment", color: "gray" },
};

const CATEGORY_COLORS: Record<ActionCategory, CategoryPalette> = {
  account: {
    bg: "var(--status-running-bg)",
    text: "var(--status-running-text)",
    border: "var(--status-running-border)",
  },
  github: {
    bg: "var(--status-success-bg)",
    text: "var(--status-success-text)",
    border: "var(--status-success-border)",
  },
  aws: {
    bg: "var(--status-rolledback-bg)",
    text: "var(--status-rolledback-text)",
    border: "var(--status-rolledback-border)",
  },
  repo: {
    bg: "var(--accent-light)",
    text: "var(--accent)",
    border: "var(--accent-border)",
  },
  environment: {
    bg: "var(--status-offhours-bg)",
    text: "var(--status-offhours-text)",
    border: "var(--status-offhours-border)",
  },
  deployment: {
    bg: "var(--status-failed-bg)",
    text: "var(--status-failed-text)",
    border: "var(--status-failed-border)",
  },
  security: {
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning-text)",
    border: "var(--status-warning-border)",
  },
  gray: {
    bg: "var(--bg-sunken)",
    text: "var(--text-muted)",
    border: "var(--border-light)",
  },
};

const CATEGORY_ICONS: Record<ActionCategory, LucideIcon> = {
  account: UserCircle2,
  github: Github,
  aws: Cloud,
  repo: Folder,
  environment: Layers,
  deployment: Rocket,
  security: Shield,
  gray: Activity,
};

const CATEGORY_OPTIONS: Array<{ value: "all" | ActionCategory; label: string; category?: ActionCategory }> = [
  { value: "all", label: "All categories" },
  { value: "account", label: "Account", category: "account" },
  { value: "github", label: "GitHub", category: "github" },
  { value: "aws", label: "AWS", category: "aws" },
  { value: "repo", label: "Repository", category: "repo" },
  { value: "environment", label: "Environment", category: "environment" },
  { value: "deployment", label: "Deployment", category: "deployment" },
  { value: "security", label: "Security", category: "security" },
];

const ENTITY_BADGES: Record<string, string> = {
  account: "ACCOUNT",
  repository: "REPO",
  environment: "ENV",
  github_connection: "GITHUB",
  aws_connection: "AWS",
  deployment: "DEPLOY",
};

function normalizeActionKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized.includes(".")) {
    return normalized;
  }

  const parts = normalized.split("_").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts.slice(1).join("_")}`;
  }

  return normalized;
}

function humanizeUnknownAction(value: string): string {
  const display = normalizeActionKey(value)
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!display) {
    return "Unknown action";
  }

  return `${display.charAt(0).toUpperCase()}${display.slice(1)}`;
}

function resolveAction(value: string): ActionResolved {
  const key = normalizeActionKey(value);
  const mapped = ACTION_LABELS[key];

  if (mapped) {
    return { ...mapped, key };
  }

  return {
    key,
    label: humanizeUnknownAction(value),
    icon: "Activity",
    category: "gray",
    color: "gray",
  };
}

function toDateKey(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatLongDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatFullDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getRelativeTime(value: string, nowMs: number): string {
  const createdMs = new Date(value).getTime();
  const deltaSeconds = Math.max(0, Math.floor((nowMs - createdMs) / 1000));

  if (deltaSeconds < 15) {
    return "just now";
  }

  if (deltaSeconds < 60) {
    return `${deltaSeconds} seconds ago`;
  }

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes === 1) {
    return "1 minute ago";
  }
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours === 1) {
    return "1 hour ago";
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "1 day ago";
  }
  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return "1 week ago";
  }
  if (weeks < 5) {
    return `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months === 1) {
    return "1 month ago";
  }

  return `${months} months ago`;
}

function formatDateHeader(dateKey: string, timeZone: string, nowMs: number): string {
  const todayKey = toDateKey(new Date(nowMs).toISOString(), timeZone);
  const yesterdayKey = toDateKey(new Date(nowMs - (24 * 60 * 60 * 1000)).toISOString(), timeZone);
  const prettyDate = formatLongDate(`${dateKey}T12:00:00.000Z`, timeZone);

  if (dateKey === todayKey) {
    return `Today — ${prettyDate}`;
  }

  if (dateKey === yesterdayKey) {
    return `Yesterday — ${prettyDate}`;
  }

  return prettyDate;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function metadataText(metadata: Record<string, unknown> | null, keys: string[]): string | null {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const item = metadata[key];
    if (typeof item === "string" && item.trim()) {
      return item.trim();
    }
  }

  return null;
}

function entityBadge(entityType: string): string {
  const normalized = entityType.trim().toLowerCase();
  if (ENTITY_BADGES[normalized]) {
    return ENTITY_BADGES[normalized];
  }

  return normalized.replace(/[_\s-]+/g, " ").trim().toUpperCase() || "GENERAL";
}

function metadataContext(entry: AuditLogEntry): string | null {
  const actionKey = normalizeActionKey(entry.action);
  const metadata = asRecord(entry.metadata);

  if (actionKey === "repo.tracked" || actionKey === "repo.untracked") {
    return metadataText(metadata, ["repository_full_name", "full_name", "repo_full_name", "repository", "repo"]);
  }

  if (actionKey.startsWith("environment.")) {
    const value = metadataText(metadata, ["display_name", "environment_name", "name", "environment"]);
    if (!value) {
      return null;
    }

    return value.toLowerCase().includes("environment") ? value : `${value} environment`;
  }

  if (actionKey.startsWith("github.")) {
    const username = metadataText(metadata, ["username", "github_username", "login"]);
    if (!username) {
      return null;
    }

    return username.startsWith("@") ? username : `@${username}`;
  }

  if (actionKey === "account.name_changed") {
    return "Name updated";
  }

  return metadataText(metadata, ["message", "detail", "description", "name", "full_name"]);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatCsvDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCsvTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function AuditLogPage() {
  const user = useAuthStore((state) => state.user);

  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<"all" | ActionCategory>("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);

  const [nowTick, setNowTick] = useState(Date.now());
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const timezone = useMemo(() => {
    return window.localStorage.getItem("deploylens-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onOutsideClick);
    return () => {
      window.removeEventListener("mousedown", onOutsideClick);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setAuditLoading(true);
    setAuditError(null);

    void audit.list({
      page: auditPage,
      limit: 20,
    }).then((response) => {
      if (!active) {
        return;
      }

      setAuditEntries((previous) => {
        if (auditPage === 1) {
          return response.entries;
        }

        const seen = new Set(previous.map((entry) => entry.id));
        const next = response.entries.filter((entry) => !seen.has(entry.id));
        return [...previous, ...next];
      });

      setAuditHasMore(response.pagination.hasNext);
      setAuditTotal(response.pagination.total);
      setAuditLoading(false);
    }).catch(() => {
      if (!active) {
        return;
      }

      setAuditLoading(false);
      setAuditError("Unable to load audit activity.");
      if (auditPage === 1) {
        setAuditEntries([]);
      }
      setAuditHasMore(false);
    });

    return () => {
      active = false;
    };
  }, [auditPage]);

  const actionOptions = useMemo(() => {
    const options = new Map<string, ActionResolved>();

    Object.entries(ACTION_LABELS).forEach(([key, descriptor]) => {
      if (categoryFilter === "all" || descriptor.category === categoryFilter) {
        options.set(key, { ...descriptor, key });
      }
    });

    auditEntries.forEach((entry) => {
      const resolved = resolveAction(entry.action);
      if (categoryFilter !== "all" && resolved.category !== categoryFilter) {
        return;
      }

      if (!options.has(resolved.key)) {
        options.set(resolved.key, resolved);
      }
    });

    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [auditEntries, categoryFilter]);

  useEffect(() => {
    if (actionFilter === "all") {
      return;
    }

    if (!actionOptions.some((option) => option.key === actionFilter)) {
      setActionFilter("all");
    }
  }, [actionFilter, actionOptions]);

  const decoratedEntries = useMemo<DecoratedEntry[]>(() => {
    return auditEntries
      .map((entry) => {
        const resolved = resolveAction(entry.action);

        return {
          entry,
          action: resolved,
          dateKey: toDateKey(entry.created_at, timezone),
          entityBadge: entityBadge(entry.entity_type),
          metadataContext: metadataContext(entry),
        };
      })
      .sort((left, right) => new Date(right.entry.created_at).getTime() - new Date(left.entry.created_at).getTime());
  }, [auditEntries, timezone]);

  const filteredEntries = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();

    return decoratedEntries.filter((item) => {
      if (categoryFilter !== "all" && item.action.category !== categoryFilter) {
        return false;
      }

      if (actionFilter !== "all" && item.action.key !== actionFilter) {
        return false;
      }

      if (auditFrom && item.dateKey < auditFrom) {
        return false;
      }

      if (auditTo && item.dateKey > auditTo) {
        return false;
      }

      if (query) {
        const haystack = [
          item.action.label,
          item.action.key,
          item.metadataContext ?? "",
          item.entry.entity_type,
        ].join(" ").toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [actionFilter, auditFrom, auditSearch, auditTo, categoryFilter, decoratedEntries]);

  const groupedEntries = useMemo<GroupedEntries[]>(() => {
    const groups: GroupedEntries[] = [];
    const map = new Map<string, GroupedEntries>();

    filteredEntries.forEach((item) => {
      if (!map.has(item.dateKey)) {
        const group: GroupedEntries = {
          key: item.dateKey,
          header: formatDateHeader(item.dateKey, timezone, nowTick),
          entries: [],
        };

        map.set(item.dateKey, group);
        groups.push(group);
      }

      map.get(item.dateKey)?.entries.push(item);
    });

    return groups;
  }, [filteredEntries, nowTick, timezone]);

  const totalActions = filteredEntries.length;
  const shownCount = filteredEntries.length;

  const todayActions = useMemo(() => {
    const todayKey = toDateKey(new Date(nowTick).toISOString(), timezone);
    return filteredEntries.filter((item) => item.dateKey === todayKey).length;
  }, [filteredEntries, nowTick, timezone]);

  const weekActions = useMemo(() => {
    const cutoff = nowTick - (7 * 24 * 60 * 60 * 1000);
    return filteredEntries.filter((item) => new Date(item.entry.created_at).getTime() >= cutoff).length;
  }, [filteredEntries, nowTick]);

  const sinceDate = useMemo(() => {
    if (user?.created_at) {
      return formatLongDate(user.created_at, timezone);
    }

    if (decoratedEntries.length > 0) {
      return formatLongDate(decoratedEntries[decoratedEntries.length - 1].entry.created_at, timezone);
    }

    return "today";
  }, [decoratedEntries, timezone, user?.created_at]);

  const hasActiveFilters =
    categoryFilter !== "all" ||
    actionFilter !== "all" ||
    Boolean(auditFrom) ||
    Boolean(auditTo) ||
    Boolean(auditSearch.trim());

  const categoryLabel = CATEGORY_OPTIONS.find((item) => item.value === categoryFilter)?.label ?? "All categories";

  function clearFilters() {
    setCategoryFilter("all");
    setActionFilter("all");
    setAuditFrom("");
    setAuditTo("");
    setAuditSearch("");
  }

  function exportCsv() {
    const lines = [
      ["Date", "Time", "Action", "Category", "Entity Type", "IP Address"].join(","),
      ...filteredEntries.map((item) => {
        const row = [
          formatCsvDate(item.entry.created_at, timezone),
          formatCsvTime(item.entry.created_at, timezone),
          item.action.label,
          item.action.category,
          item.entry.entity_type,
          item.entry.ip_address ?? "-",
        ];

        return row.map((cell) => escapeCsv(cell)).join(",");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `deploylens-audit-${toDateKey(new Date(nowTick).toISOString(), timezone)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="A complete record of all actions taken in DeployLens"
        actions={(
          <button type="button" className="settings-audit-export-btn" onClick={exportCsv}>
            <Download size={13} />
            Export
          </button>
        )}
      />

      <SettingsLayout>
        <div className="settings-audit-wrap">
          <section className="settings-audit-filter-bar">
            <div className="settings-audit-category-filter" ref={menuRef}>
              <button
                type="button"
                className="settings-audit-category-trigger"
                onClick={() => setCategoryMenuOpen((open) => !open)}
                aria-expanded={categoryMenuOpen}
              >
                <span
                  className="settings-audit-dot"
                  style={{
                    background: categoryFilter === "all" ? "var(--bg-sunken)" : CATEGORY_COLORS[categoryFilter].bg,
                    borderColor: categoryFilter === "all" ? "var(--border-light)" : CATEGORY_COLORS[categoryFilter].border,
                  }}
                />
                {categoryLabel}
              </button>

              {categoryMenuOpen ? (
                <div className="settings-audit-category-menu" role="listbox" aria-label="Category filter">
                  {CATEGORY_OPTIONS.map((option) => {
                    const palette = option.category ? CATEGORY_COLORS[option.category] : CATEGORY_COLORS.gray;
                    const active = option.value === categoryFilter;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={active ? "settings-audit-category-option active" : "settings-audit-category-option"}
                        onClick={() => {
                          setCategoryFilter(option.value);
                          setActionFilter("all");
                          setCategoryMenuOpen(false);
                        }}
                      >
                        <span
                          className="settings-audit-dot"
                          style={{
                            background: palette.bg,
                            borderColor: palette.border,
                          }}
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <select
              className="settings-audit-filter-select"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="all">All actions</option>
              {actionOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="settings-audit-date-range">
              <input
                type="date"
                className="settings-audit-date-input"
                value={auditFrom}
                max={auditTo || undefined}
                onChange={(event) => setAuditFrom(event.target.value)}
              />
              <input
                type="date"
                className="settings-audit-date-input"
                value={auditTo}
                min={auditFrom || undefined}
                onChange={(event) => setAuditTo(event.target.value)}
              />
            </div>

            <div className="settings-audit-search-wrap">
              <Search size={13} />
              <input
                className="settings-audit-search-input"
                placeholder="Search actions..."
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
              />
            </div>

            {hasActiveFilters ? (
              <button type="button" className="settings-audit-clear-btn" onClick={clearFilters}>
                <X size={12} />
                Clear filters
              </button>
            ) : null}
          </section>

          <section className="settings-audit-stats-row" aria-label="Audit summary">
            <div className="settings-audit-stat-chip">
              <span className="settings-audit-stat-dot" />
              {totalActions} total actions
            </div>
            <div className="settings-audit-stat-chip">
              <span className="settings-audit-stat-dot" />
              {todayActions} today
            </div>
            <div className="settings-audit-stat-chip">
              <span className="settings-audit-stat-dot" />
              {weekActions} this week
            </div>
            <div className="settings-audit-stat-chip">
              <span className="settings-audit-stat-dot" />
              Since {sinceDate}
            </div>
          </section>

          <section className="settings-audit-log-container">
            {groupedEntries.length > 0 ? (
              groupedEntries.map((group) => (
                <div key={group.key} className="settings-audit-date-group">
                  <div className="settings-audit-date-header">{group.header}</div>

                  {group.entries.map((item, index) => {
                    const Icon = CATEGORY_ICONS[item.action.category];
                    const palette = CATEGORY_COLORS[item.action.category];

                    return (
                      <article
                        key={item.entry.id}
                        className={index === group.entries.length - 1 ? "settings-audit-row settings-audit-row-last" : "settings-audit-row"}
                      >
                        <div
                          className="settings-audit-icon-badge"
                          style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
                          title={item.action.label}
                        >
                          <Icon size={16} />
                        </div>

                        <div className="settings-audit-main-col">
                          <div className="settings-audit-main-line">
                            <span className="settings-audit-action-label">{item.action.label}</span>
                            <span
                              className="settings-audit-entity-badge"
                              style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
                            >
                              {item.entityBadge}
                            </span>
                          </div>

                          {item.metadataContext ? (
                            <p className="settings-audit-metadata-text">{item.metadataContext}</p>
                          ) : null}
                        </div>

                        <div className="settings-audit-ip-col">{item.entry.ip_address ?? "—"}</div>
                        <div className="settings-audit-time-col" title={formatFullDateTime(item.entry.created_at, timezone)}>
                          {getRelativeTime(item.entry.created_at, nowTick)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="settings-audit-empty-state">
                <ScrollText size={32} />
                <h3>{hasActiveFilters ? "No matching activity" : "No activity recorded yet"}</h3>
                <p>
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "Actions you take in DeployLens will appear here"}
                </p>

                {hasActiveFilters ? (
                  <button type="button" className="settings-btn settings-btn-primary settings-btn-sm" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
              </div>
            )}

            {auditLoading && auditEntries.length === 0 ? (
              <div className="settings-audit-empty-state">
                <span className="settings-spinner" aria-hidden="true" />
                <h3>Loading activity</h3>
                <p>Fetching your latest audit events</p>
              </div>
            ) : null}

            {auditError ? <div className="settings-audit-inline-error">{auditError}</div> : null}
          </section>

          {auditHasMore ? (
            <div className="settings-audit-pagination">
              <button
                type="button"
                className="settings-audit-load-more-btn"
                onClick={() => setAuditPage((value) => value + 1)}
                disabled={auditLoading}
              >
                {auditLoading ? (
                  <>
                    <span className="settings-spinner" aria-hidden="true" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </button>

              <p className="settings-audit-pagination-copy">
                Showing {shownCount} of {Math.max(auditTotal, shownCount)} actions
              </p>
            </div>
          ) : null}

          {!auditHasMore && filteredEntries.length > 0 ? (
            <p className="settings-audit-pagination-copy">
              Showing {shownCount} of {Math.max(auditTotal, shownCount)} actions
            </p>
          ) : null}
        </div>
      </SettingsLayout>
    </>
  );
}
