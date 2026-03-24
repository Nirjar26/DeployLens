import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";

export default function RepositoriesPage() {
  return (
    <>
      <PageHeader
        title="Repositories"
        subtitle="Repos being monitored for deployments"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <p style={{ color: "var(--text-muted)" }}>Coming soon</p>
        </div>
      </SettingsLayout>
    </>
  );
}
