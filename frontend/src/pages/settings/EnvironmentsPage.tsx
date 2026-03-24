import { useEffect } from "react";
import EnvironmentCard from "../../components/onboarding/EnvironmentCard";
import PageHeader from "../../components/layout/PageHeader";
import SettingsLayout from "../../components/layout/SettingsLayout";
import { useAwsStore } from "../../store/awsStore";
import { useNavigate } from "react-router-dom";

export default function EnvironmentsPage() {
  const navigate = useNavigate();
  const environments = useAwsStore((state) => state.environments);
  const fetchEnvironments = useAwsStore((state) => state.fetchEnvironments);
  const awsConnected = useAwsStore((state) => state.awsConnected);
  const removeEnvironment = useAwsStore((state) => state.removeEnvironment);

  useEffect(() => {
    if (awsConnected) {
      void fetchEnvironments();
    }
  }, [awsConnected, fetchEnvironments]);

  return (
    <>
      <PageHeader
        title="Environments"
        subtitle="CodeDeploy group mappings"
      />
      <SettingsLayout>
        <div style={{ padding: "24px 0" }}>
          <section className="settings-section">
            <h3>Environments</h3>
            {awsConnected ? (
              <div className="env-list-wrap">
                {environments.map((env) => (
                  <EnvironmentCard
                    key={env.id}
                    environment={env}
                    onUpdate={async () => Promise.resolve()}
                    onDelete={async (id) => {
                      await removeEnvironment(id);
                    }}
                  />
                ))}
                {environments.length === 0 ? <p>No environments configured yet.</p> : null}
              </div>
            ) : (
              <p>AWS is not connected yet. Connect AWS first to manage environments.</p>
            )}
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              onClick={() => navigate("/onboarding/environments")}
            >
              Add environment
            </button>
          </section>
        </div>
      </SettingsLayout>
    </>
  );
}
