import { Check, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EnvironmentItem } from "../../store/awsStore";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

type Props = {
  environment: EnvironmentItem;
  onUpdate: (id: string, payload: { display_name?: string; color_tag?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function EnvironmentCard({ environment, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayName, setDisplayName] = useState(environment.display_name);
  const [color, setColor] = useState(environment.color_tag);

  const changed = useMemo(() => {
    return displayName !== environment.display_name || color !== environment.color_tag;
  }, [color, displayName, environment.color_tag, environment.display_name]);

  async function handleConfirmEdit() {
    await onUpdate(environment.id, { display_name: displayName, color_tag: color });
    setIsEditing(false);
  }

  async function handleDelete() {
    await onDelete(environment.id);
  }

  if (isDeleting) {
    return (
      <div className="env-row env-row-delete">
        <span>Remove {environment.display_name}? This won&apos;t delete deployment history.</span>
        <div className="env-actions-inline">
          <button type="button" className="link-danger" onClick={handleDelete}>Yes, remove</button>
          <button type="button" className="link-button" onClick={() => setIsDeleting(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="env-row">
      <div className="env-left">
        <span className="env-color-dot" style={{ backgroundColor: isEditing ? color : environment.color_tag }} />
        <div>
          {isEditing ? (
            <input className="auth-input env-name-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          ) : (
            <div className="env-name">{environment.display_name}</div>
          )}
          <div className="env-repo">{environment.repository_full_name}</div>
        </div>
      </div>

      <div className="env-center aws-mono">{environment.codedeploy_app} -&gt; {environment.codedeploy_group}</div>

      <div className="env-actions">
        {isEditing ? (
          <>
            <div className="color-swatch-group inline-swatches">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`color-swatch ${color === swatch ? "color-swatch-active" : ""}`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => setColor(swatch)}
                >
                  {color === swatch ? <Check size={12} /> : null}
                </button>
              ))}
            </div>
            <button type="button" className="icon-btn" onClick={handleConfirmEdit} disabled={!changed}>
              <Check size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setDisplayName(environment.display_name);
                setColor(environment.color_tag);
                setIsEditing(false);
              }}
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={() => setIsEditing(true)}>
              <Pencil size={15} />
            </button>
            <button type="button" className="icon-btn icon-danger" onClick={() => setIsDeleting(true)}>
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
