import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Lock, Monitor, Shield, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { account } from "../../lib/api";
import { setAccessToken } from "../../lib/auth";
import FormField from "../../components/shared/FormField";
import { useToast } from "../../hooks/useToast";
import { useAuthStore } from "../../store/authStore";
import { parseApiErrorCode } from "./settingsHelpers";

type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "8+ characters" },
  { key: "upper", label: "Uppercase letter" },
  { key: "number", label: "Number" },
  { key: "special", label: "Special character" },
] as const;

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function evaluatePasswordStrength(password: string): {
  level: PasswordStrengthLevel;
  segments: number;
  label: string;
  colorClass: string;
  requirements: Record<(typeof PASSWORD_REQUIREMENTS)[number]["key"], boolean>;
} {
  const requirements = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  if (password.length <= 5) {
    return {
      level: "weak",
      segments: 1,
      label: "Weak",
      colorClass: "weak",
      requirements,
    };
  }

  if (password.length <= 8) {
    return {
      level: "fair",
      segments: 2,
      label: "Fair",
      colorClass: "fair",
      requirements,
    };
  }

  const metCount = Object.values(requirements).filter(Boolean).length;
  if (password.length >= 12 && metCount === 4) {
    return {
      level: "strong",
      segments: 4,
      label: "Strong",
      colorClass: "strong",
      requirements,
    };
  }

  return {
    level: "good",
    segments: 3,
    label: "Good",
    colorClass: "good",
    requirements,
  };
}

export default function SecurityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sessions, setSessions] = useState<Array<{ id: string; created_at: string; last_used: string; is_current: boolean }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsUnavailable, setSessionsUnavailable] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const logoutTimerRef = useRef<number | null>(null);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);
  const confirmHasValue = confirmPassword.length > 0;
  const passwordMatches = confirmPassword === newPassword;

  const canUpdatePassword = useMemo(
    () =>
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      passwordMatches &&
      passwordStrength.level !== "weak" &&
      !passwordSaving,
    [currentPassword, newPassword, passwordMatches, passwordStrength.level, passwordSaving],
  );

  const passwordChangedText = "Never changed";

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current !== null) {
        window.clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  async function loadSessions() {
    setSessionsLoading(true);
    setSessionsUnavailable(false);

    try {
      const data = await account.getSessions();
      setSessions(data);
    } catch {
      setSessions([]);
      setSessionsUnavailable(true);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleUpdatePassword() {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const response = await account.updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setAccessToken(response.accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated. Please log in again.");
      toast.success("Password updated", "Password updated. Please log in again.");

      if (logoutTimerRef.current !== null) {
        window.clearTimeout(logoutTimerRef.current);
      }

      logoutTimerRef.current = window.setTimeout(() => {
        clearAuth();
        navigate("/login", { replace: true });
      }, 3000);
    } catch (error) {
      const code = parseApiErrorCode(error);
      if (code === "WRONG_PASSWORD") {
        setPasswordError("Current password is incorrect.");
      } else if (code === "PASSWORD_MISMATCH") {
        setPasswordError("New password and confirmation do not match.");
      } else {
        setPasswordError("Could not update password.");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function revokeSession(sessionId: string) {
    setRevokingSessionId(sessionId);

    try {
      await account.revokeSession(sessionId);
      await loadSessions();
      toast.success("Session revoked");
    } catch {
      toast.error("Unable to revoke", "Please try again.");
    } finally {
      setRevokingSessionId(null);
    }
  }

  async function revokeAllOtherSessions() {
    const otherSessions = sessions.filter((session) => !session.is_current);
    if (!otherSessions.length) {
      return;
    }

    setRevokingOthers(true);

    try {
      await Promise.all(otherSessions.map((session) => account.revokeSession(session.id)));
      await loadSessions();
      toast.success("Other sessions revoked");
    } catch {
      toast.error("Unable to revoke all", "Please try again.");
    } finally {
      setRevokingOthers(false);
    }
  }

  return (
    <>
      <PageHeader title="Security" subtitle="Password and account safety controls" />
      <SettingsLayout>
        <div className="settings-security-wrap">
          <section className="settings-card">
            <header className="settings-card-header">
              <h2 className="settings-card-title">
                <Lock size={14} />
                Password
              </h2>
            </header>

            <div className="settings-card-body">
              <div className="settings-password-last-changed-row">
                <ShieldCheck size={13} />
                <span>Password last changed: {passwordChangedText}</span>
              </div>

              <div className="settings-security-form-stack">
                <FormField
                  label="CURRENT PASSWORD"
                  showPasswordToggle
                  isPasswordVisible={showCurrentPassword}
                  onTogglePasswordVisibility={() => setShowCurrentPassword((value) => !value)}
                  inputProps={{
                    type: showCurrentPassword ? "text" : "password",
                    value: currentPassword,
                    onChange: (event) => setCurrentPassword(event.target.value),
                    autoComplete: "current-password",
                  }}
                />

                <FormField
                  label="NEW PASSWORD"
                  showPasswordToggle
                  isPasswordVisible={showNewPassword}
                  onTogglePasswordVisibility={() => setShowNewPassword((value) => !value)}
                  inputProps={{
                    type: showNewPassword ? "text" : "password",
                    value: newPassword,
                    onChange: (event) => setNewPassword(event.target.value),
                    autoComplete: "new-password",
                  }}
                />

                {newPassword ? (
                  <div className="settings-password-strength-wrap">
                    <div className="settings-password-strength-row">
                      <div className="settings-password-strength-segments">
                        {[0, 1, 2, 3].map((segment) => (
                          <span
                            key={segment}
                            className={
                              segment < passwordStrength.segments
                                ? `settings-strength-segment active ${passwordStrength.colorClass}`
                                : "settings-strength-segment"
                            }
                          />
                        ))}
                      </div>

                      <span className={`settings-password-strength-label ${passwordStrength.colorClass}`}>
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="settings-password-requirements-wrap">
                      {PASSWORD_REQUIREMENTS.map((requirement) => {
                        const met = passwordStrength.requirements[requirement.key];
                        return (
                          <span
                            key={requirement.key}
                            className={met ? "settings-password-chip met" : "settings-password-chip"}
                          >
                            {met ? <Check size={9} /> : null}
                            {requirement.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <FormField
                  label="CONFIRM PASSWORD"
                  showPasswordToggle
                  isPasswordVisible={showConfirmPassword}
                  onTogglePasswordVisibility={() => setShowConfirmPassword((value) => !value)}
                  inputProps={{
                    type: showConfirmPassword ? "text" : "password",
                    value: confirmPassword,
                    onChange: (event) => setConfirmPassword(event.target.value),
                    autoComplete: "new-password",
                    className: confirmHasValue
                      ? (passwordMatches ? "settings-field-input-success" : "settings-field-input-error")
                      : "",
                  }}
                />

                {confirmHasValue ? (
                  <p className={passwordMatches ? "settings-field-message-success" : "settings-field-message-error"}>
                    {passwordMatches ? "Passwords match" : "Passwords do not match"}
                  </p>
                ) : null}

                <div className="settings-profile-actions">
                  <button
                    type="button"
                    className="settings-btn settings-btn-primary settings-btn-md"
                    onClick={() => void handleUpdatePassword()}
                    disabled={!canUpdatePassword}
                  >
                    {passwordSaving ? (
                      <>
                        <span className="settings-spinner" aria-hidden="true" />
                        Updating...
                      </>
                    ) : (
                      "Update password"
                    )}
                  </button>
                </div>

                {passwordMessage ? <p className="settings-field-message-success">{passwordMessage}</p> : null}
                {passwordError ? <p className="settings-field-message-error">{passwordError}</p> : null}
              </div>
            </div>
          </section>

          <section className="settings-card">
            <header className="settings-card-header">
              <h2 className="settings-card-title">
                <Monitor size={14} />
                Active sessions
              </h2>

              <button
                type="button"
                className="settings-btn settings-btn-secondary settings-sessions-revoke-all-btn"
                onClick={() => void revokeAllOtherSessions()}
                disabled={revokingOthers || sessions.every((session) => session.is_current)}
              >
                {revokingOthers ? "Revoking..." : "Revoke all others"}
              </button>
            </header>

            <div className="settings-card-body">
              {sessionsLoading ? <p className="settings-field-helper">Loading sessions...</p> : null}

              {!sessionsLoading && (sessionsUnavailable || sessions.length === 0) ? (
                <div className="settings-sessions-empty-placeholder">Session management coming soon</div>
              ) : null}

              {!sessionsLoading && !sessionsUnavailable && sessions.length > 0 ? (
                <div>
                  {sessions.map((session, index) => (
                    <div
                      key={session.id}
                      className={
                        index === sessions.length - 1
                          ? "settings-session-row no-border"
                          : "settings-session-row"
                      }
                    >
                      <div className="settings-session-icon-box">
                        <Monitor size={16} />
                      </div>

                      <div className="settings-session-content">
                        <div className="settings-session-title-row">
                          <span className="settings-session-title">Browser session</span>
                          {session.is_current ? (
                            <span className="settings-session-current-pill">(this session)</span>
                          ) : null}
                        </div>
                        <p className="settings-session-subtext">
                          Created {formatRelativeTime(session.created_at)} · Last active {formatRelativeTime(session.last_used)}
                        </p>
                      </div>

                      {session.is_current ? (
                        <span className="settings-session-current-label">Current</span>
                      ) : (
                        <button
                          type="button"
                          className="settings-session-revoke-btn"
                          onClick={() => void revokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                        >
                          {revokingSessionId === session.id ? "Revoking..." : "Revoke"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="settings-card">
            <header className="settings-card-header">
              <h2 className="settings-card-title">
                <Shield size={14} />
                Two-factor authentication
              </h2>
              <span className="settings-inline-pill">Not enabled</span>
            </header>

            <div className="settings-card-body">
              <div className="settings-2fa-info-row">
                <div className="settings-2fa-icon-box">
                  <CheckCircle2 size={20} />
                </div>

                <div>
                  <p className="settings-2fa-title">Add an extra layer of security</p>
                  <p className="settings-2fa-description">
                    Two-factor authentication adds an additional layer of security by requiring a verification code when you sign in.
                  </p>
                </div>
              </div>

              <div className="settings-2fa-action-row">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary settings-btn-md"
                  onClick={() => toast.info("Two-factor authentication coming soon")}
                >
                  <Lock size={13} />
                  Enable 2FA
                </button>
              </div>
            </div>
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
