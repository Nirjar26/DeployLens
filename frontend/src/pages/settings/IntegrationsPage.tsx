import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Manage your GitHub and AWS connections"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <h2 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>GitHub</h2>
          <p style={{ color: "var(--text-muted)" }}>Coming soon</p>
        </div>
      </SettingsLayout>
    </>
  );
}
