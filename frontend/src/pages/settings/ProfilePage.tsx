import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <p style={{ color: "var(--text-muted)" }}>Coming soon</p>
        </div>
      </SettingsLayout>
    </>
  );
}
