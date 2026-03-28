import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleUserRound, Copy, Info, Link2, Lock, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import ConfirmModal from "../../components/shared/ConfirmModal";
import FormField from "../../components/shared/FormField";
import { useToast } from "../../hooks/useToast";
import { account } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useAwsStore } from "../../store/awsStore";
import { parseApiErrorCode } from "./settingsHelpers";

const AVATAR_COLOR_STORAGE_KEY = "deploylens-avatar-color";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const AVATAR_PRESETS = [
  {
    id: "preset-1",
    bg: "var(--avatar-preset-1-bg)",
    text: "var(--avatar-preset-1-text)",
    ring: "var(--avatar-preset-1-text)",
  },
  {
    id: "preset-2",
    bg: "var(--avatar-preset-2-bg)",
    text: "var(--avatar-preset-2-text)",
    ring: "var(--avatar-preset-2-text)",
  },
  {
    id: "preset-3",
    bg: "var(--avatar-preset-3-bg)",
    text: "var(--avatar-preset-3-text)",
    ring: "var(--avatar-preset-3-text)",
  },
  {
    id: "preset-4",
    bg: "var(--avatar-preset-4-bg)",
    text: "var(--avatar-preset-4-text)",
    ring: "var(--avatar-preset-4-text)",
  },
  {
    id: "preset-5",
    bg: "var(--avatar-preset-5-bg)",
    text: "var(--avatar-preset-5-text)",
    ring: "var(--avatar-preset-5-text)",
  },
  {
    id: "preset-6",
    bg: "var(--avatar-preset-6-bg)",
    text: "var(--avatar-preset-6-text)",
    ring: "var(--avatar-preset-6-text)",
  },
];

function formatMemberSince(createdAt?: string) {
  if (!createdAt) {
    return "Unknown";
  }

  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const githubConnected = useAuthStore((state) => state.githubConnected);
  const githubUsername = useAuthStore((state) => state.githubUsername);

  const awsConnected = useAwsStore((state) => state.awsConnected);
  const awsAccountId = useAwsStore((state) => state.awsAccountId);
  const awsAccountAlias = useAwsStore((state) => state.awsAccountAlias);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<"idle" | "saving" | "saved">("idle");

  const [avatarColorId, setAvatarColorId] = useState("preset-1");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const saveResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setProfileName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    const storedColor = window.localStorage.getItem(AVATAR_COLOR_STORAGE_KEY);
    if (storedColor && AVATAR_PRESETS.some((preset) => preset.id === storedColor)) {
      setAvatarColorId(storedColor);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveResetTimerRef.current !== null) {
        window.clearTimeout(saveResetTimerRef.current);
      }
    };
  }, []);

  const selectedAvatarPreset = useMemo(
    () => AVATAR_PRESETS.find((preset) => preset.id === avatarColorId) ?? AVATAR_PRESETS[0],
    [avatarColorId],
  );

  const initial = (user?.name ?? "U").trim().charAt(0).toUpperCase();
  const githubLabel = githubConnected ? `@${githubUsername ?? "unknown"}` : "Not connected";
  const awsLabel = awsConnected ? (awsAccountAlias || awsAccountId || "Connected") : "Not connected";
  const memberSince = formatMemberSince(user?.created_at);

  async function handleSaveProfile() {
    if (!profileName.trim()) {
      setProfileError("Name is required.");
      setProfileMessage(null);
      setProfileState("idle");
      return;
    }

    setProfileState("saving");
    setProfileError(null);
    setProfileMessage(null);

    try {
      const updated = await account.updateProfile(profileName.trim());
      updateUser({ name: updated.name });
      setProfileMessage("Profile updated.");
      setProfileState("saved");

      if (saveResetTimerRef.current !== null) {
        window.clearTimeout(saveResetTimerRef.current);
      }

      saveResetTimerRef.current = window.setTimeout(() => {
        setProfileState("idle");
      }, 2000);
    } catch {
      setProfileError("Could not update profile.");
      setProfileState("idle");
    }
  }

  async function handleDeleteAccount() {
    setDeleteSaving(true);

    const password = window.prompt("Enter your password to permanently delete your account:");
    if (!password) {
      setDeleteSaving(false);
      return;
    }

    try {
      await account.deleteAccount(password);
      clearAuth();
      navigate("/login", { replace: true });
    } catch (error) {
      const code = parseApiErrorCode(error);
      if (code === "WRONG_PASSWORD") {
        toast.error("Delete failed", "Password is incorrect.");
      } else {
        toast.error("Delete failed", "Failed to delete account.");
      }
      setDeleteSaving(false);
    }
  }

  function handleAvatarColorSelect(id: string) {
    setAvatarColorId(id);
    window.localStorage.setItem(AVATAR_COLOR_STORAGE_KEY, id);
  }

  async function handleCopyUserId() {
    if (!user?.id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(user.id);
      toast.success("Copied", "User ID copied to clipboard.");
    } catch {
      toast.error("Copy failed", "Could not copy user ID.");
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your personal account details" />
      <SettingsLayout>
        <div className="settings-profile-wrap">
          <div className="settings-profile-grid">
            <div className="settings-profile-main-col">
              <section className="settings-card">
                <header className="settings-card-header">
                  <h2 className="settings-card-title">
                    <CircleUserRound size={14} />
                    Profile
                  </h2>
                </header>

                <div className="settings-card-body">
                  <div className="settings-profile-avatar-row">
                    <div
                      className="settings-profile-avatar"
                      style={{
                        background: selectedAvatarPreset.bg,
                        color: selectedAvatarPreset.text,
                      }}
                      aria-hidden="true"
                    >
                      {initial || "U"}
                    </div>

                    <div className="settings-profile-avatar-meta">
                      <div className="settings-profile-avatar-name">{user?.name ?? "Unnamed user"}</div>
                      <div className="settings-profile-avatar-email">{user?.email ?? ""}</div>

                      <div className="settings-profile-avatar-swatches" aria-label="Change avatar color">
                        {AVATAR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className="settings-profile-avatar-swatch"
                            style={{
                              background: preset.bg,
                              boxShadow:
                                avatarColorId === preset.id
                                  ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${preset.ring}`
                                  : "none",
                            }}
                            onClick={() => handleAvatarColorSelect(preset.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="settings-profile-form-stack">
                    <FormField
                      label="FULL NAME"
                      helper="This name appears in your profile and activity logs"
                      inputProps={{
                        value: profileName,
                        onChange: (event) => setProfileName(event.target.value),
                        placeholder: "Enter your name",
                        autoComplete: "name",
                      }}
                    />

                    <FormField
                      label="EMAIL ADDRESS"
                      helper="Email cannot be changed"
                      inputProps={{
                        value: user?.email ?? "",
                        disabled: true,
                        readOnly: true,
                      }}
                      rightAdornment={<Lock size={14} />}
                    />

                    <FormField
                      as="select"
                      label="TIMEZONE"
                      helper="Affects how timestamps are displayed in the dashboard"
                      selectProps={{
                        value: timezone,
                        onChange: (event) => setTimezone(event.target.value),
                      }}
                    >
                      {TIMEZONES.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </FormField>
                  </div>

                  <div className="settings-profile-actions">
                    <button
                      type="button"
                      className="settings-btn settings-btn-primary settings-btn-md"
                      onClick={() => void handleSaveProfile()}
                      disabled={profileState === "saving"}
                    >
                      {profileState === "saving" ? (
                        <>
                          <span className="settings-spinner" aria-hidden="true" />
                          Saving...
                        </>
                      ) : null}
                      {profileState === "saved" ? (
                        <>
                          <Check size={14} />
                          Saved
                        </>
                      ) : null}
                      {profileState === "idle" ? "Save profile" : null}
                    </button>
                  </div>

                  {profileMessage ? <p className="settings-field-message-success">{profileMessage}</p> : null}
                  {profileError ? <p className="settings-field-message-error">{profileError}</p> : null}
                </div>
              </section>
            </div>

            <aside className="settings-profile-side-col">
              <section className="settings-card">
                <header className="settings-card-header">
                  <h2 className="settings-card-title">
                    <Info size={14} />
                    Account details
                  </h2>
                </header>

                <div className="settings-card-body">
                  <div className="settings-kv-row">
                    <span className="settings-kv-label">Member since</span>
                    <span className="settings-kv-value">{memberSince}</span>
                  </div>

                  <div className="settings-kv-row">
                    <span className="settings-kv-label">User ID</span>
                    <span className="settings-kv-value settings-profile-user-id-wrap">
                      <span className="settings-mono">{user?.id?.slice(0, 8) ?? "--------"}</span>
                      <button
                        type="button"
                        className="settings-profile-copy-btn"
                        onClick={() => void handleCopyUserId()}
                      >
                        <Copy size={12} />
                      </button>
                    </span>
                  </div>

                  <div className="settings-kv-row">
                    <span className="settings-kv-label">Last login</span>
                    <span className="settings-kv-value">Active session</span>
                  </div>

                  <div className="settings-kv-row">
                    <span className="settings-kv-label">Account status</span>
                    <span className="settings-status-badge connected">Active</span>
                  </div>
                </div>
              </section>

              <section className="settings-card">
                <header className="settings-card-header">
                  <h2 className="settings-card-title">
                    <Link2 size={14} />
                    Linked accounts
                  </h2>
                </header>

                <div className="settings-card-body settings-linked-body">
                  <div className="settings-linked-row">
                    <div className="settings-linked-icon-wrap">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                        <path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 008.36 22.93c.57.1.78-.24.78-.54 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.3-5.23-1.27-5.23-5.66 0-1.25.44-2.27 1.17-3.07-.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.14 1.17A10.9 10.9 0 0112 6.16c.98 0 1.97.13 2.89.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.59.23 2.77.11 3.06.73.8 1.17 1.82 1.17 3.07 0 4.4-2.69 5.36-5.26 5.65.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.21.65.79.54A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                      </svg>
                    </div>

                    <div className="settings-linked-meta">{githubLabel}</div>

                    {githubConnected ? (
                      <span className="settings-status-badge connected">Connected</span>
                    ) : (
                      <button
                        type="button"
                        className="settings-btn settings-btn-secondary settings-linked-connect-btn"
                        onClick={() => navigate("/onboarding/github")}
                      >
                        Connect
                      </button>
                    )}
                  </div>

                  <div className="settings-linked-row no-border">
                    <div className="settings-linked-icon-wrap aws">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                        <path d="M4.8 7.6L12 3.5l7.2 4.1v8.8L12 20.5l-7.2-4.1V7.6zm7.2-1.3L7 9v6l5 2.8 5-2.8V9l-5-2.7z" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="settings-linked-meta">{awsLabel}</div>

                    {awsConnected ? (
                      <span className="settings-status-badge connected">Connected</span>
                    ) : (
                      <button
                        type="button"
                        className="settings-btn settings-btn-secondary settings-linked-connect-btn"
                        onClick={() => navigate("/onboarding/aws")}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="settings-danger-card">
            <header className="settings-danger-card-header">
              <TriangleAlert size={14} />
              <h2>Danger zone</h2>
            </header>

            <div className="settings-danger-card-body">
              <div>
                <p className="settings-danger-title">Delete account</p>
                <p className="settings-danger-description">
                  Permanently delete your account, all deployment history, connected integrations, and settings.
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                className="settings-danger-delete-btn"
                disabled={deleteSaving}
                onClick={() => setDeleteOpen(true)}
              >
                Delete account
              </button>
            </div>
          </section>
        </div>
      </SettingsLayout>

      <ConfirmModal
        isOpen={deleteOpen}
        title="Delete your account?"
        body="Type DELETE to confirm. This removes all your data permanently and cannot be undone."
        confirmLabel="Delete account"
        confirmVariant="danger"
        onCancel={() => {
          if (!deleteSaving) {
            setDeleteOpen(false);
          }
        }}
        onConfirm={async () => {
          await handleDeleteAccount();
        }}
      />
    </>
  );
}
