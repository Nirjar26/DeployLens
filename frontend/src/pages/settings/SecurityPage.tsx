import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { account } from "../../lib/api";
import { setAccessToken } from "../../lib/auth";
import { useAuthStore } from "../../store/authStore";
import { parseApiErrorCode } from "./settingsHelpers";

export default function SecurityPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const canDeleteAccount = useMemo(
    () => deleteConfirmText === "DELETE" && deletePassword.length > 0 && !deleteSaving,
    [deleteConfirmText, deletePassword, deleteSaving],
  );

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
      setPasswordMessage("Password changed successfully.");
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

  async function handleDeleteAccount() {
    if (!canDeleteAccount) {
      return;
    }

    setDeleteSaving(true);
    setDeleteError(null);

    try {
      await account.deleteAccount(deletePassword);
      clearAuth();
      navigate("/login", { replace: true });
    } catch (error) {
      const code = parseApiErrorCode(error);
      if (code === "WRONG_PASSWORD") {
        setDeleteError("Password is incorrect.");
      } else {
        setDeleteError("Failed to delete account.");
      }
      setDeleteSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Security" subtitle="Password and account safety controls" />
      <SettingsLayout>
        <div style={{ padding: "24px 0", display: "grid", gap: "16px" }}>
          <section className="settings-section">
            <h3>Change Password</h3>
            <div className="settings-form-grid settings-form-stack">
              <input
                className="dl-filter-input"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <input
                className="dl-filter-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <input
                className="dl-filter-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button
                type="button"
                className="auth-btn auth-btn-primary"
                onClick={() => void handleUpdatePassword()}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating..." : "Update password"}
              </button>
            </div>
            {passwordMessage ? <p className="settings-success">{passwordMessage}</p> : null}
            {passwordError ? <p className="settings-error">{passwordError}</p> : null}
          </section>

          <section className="settings-section settings-danger-zone">
            <h3>Delete Account</h3>
            <p>This permanently deletes your account and deployment history.</p>
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              onClick={() => setDeleteOpen(true)}
            >
              Delete account
            </button>
          </section>
        </div>
      </SettingsLayout>

      {deleteOpen ? (
        <div className="dl-modal-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="dl-modal-container" onClick={(event) => event.stopPropagation()}>
            <div className="dl-modal-header">
              <div className="dl-modal-header-center">
                <h3 className="dl-modal-title">Delete Account</h3>
                <p className="dl-cell-time">Type DELETE and enter your password to confirm.</p>
              </div>
            </div>
            <div className="dl-modal-body">
              <input
                className="dl-filter-input"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
              />
              <input
                className="dl-filter-input"
                type="password"
                placeholder="Password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
              {deleteError ? <p className="settings-error">{deleteError}</p> : null}
            </div>
            <div className="dl-modal-footer">
              <button type="button" className="dl-modal-close-btn" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="dl-modal-rollback-btn"
                disabled={!canDeleteAccount}
                onClick={() => void handleDeleteAccount()}
              >
                {deleteSaving ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
