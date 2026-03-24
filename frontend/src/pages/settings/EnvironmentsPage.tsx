import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";

export default function EnvironmentsPage() {
  return (
    <>
      <PageHeader
        title="Environments"
        subtitle="CodeDeploy group mappings"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <p style={{ color: "var(--text-muted)" }}>Coming soon</p>
        </div>
      </SettingsLayout>
    </>
  );
}
