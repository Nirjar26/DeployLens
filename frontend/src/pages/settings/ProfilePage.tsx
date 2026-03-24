import { useEffect, useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { account } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setProfileName(user?.name ?? "");
  }, [user?.name]);

  async function handleSaveProfile() {
    if (!profileName.trim()) {
      setProfileError("Name is required.");
      setProfileMessage(null);
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const updated = await account.updateProfile(profileName.trim());
      updateUser({ name: updated.name });
      setProfileMessage("Profile updated.");
    } catch {
      setProfileError("Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your personal account details" />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <section className="settings-section">
            <h3>Profile</h3>
            <p>{user?.email}</p>
            <div className="settings-form-grid">
              <input
                className="dl-filter-input"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <button
                type="button"
                className="auth-btn auth-btn-primary"
                onClick={() => void handleSaveProfile()}
                disabled={profileSaving}
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
            {profileMessage ? <p className="settings-success">{profileMessage}</p> : null}
            {profileError ? <p className="settings-error">{profileError}</p> : null}
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
