import { CSSProperties } from "react";

type DensityType = "compact" | "default" | "comfortable";

type Props = {
  density: DensityType;
  onChangeDensity: (density: DensityType) => void;
};

export default function DensityToggle({ density, onChangeDensity }: Props) {
  const containerStyle: CSSProperties = {
    display: "inline-flex",
    gap: "2px",
    padding: "3px",
    backgroundColor: "var(--bg-sunken)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-full)",
  };

  const buttonStyle = (isActive: boolean): CSSProperties => ({
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-full)",
    background: isActive ? "var(--bg-surface)" : "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    boxShadow: isActive ? "var(--shadow-xs)" : "none",
    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
    padding: 0,
  });

  const lineContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    width: "10px",
    height: "14px",
  };

  return (
    <div style={containerStyle}>
      <button
        type="button"
        style={buttonStyle(density === "compact")}
        onClick={() => onChangeDensity("compact")}
        title="Compact density"
      >
        <div style={lineContainerStyle}>
          <div
            style={{
              height: "2px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "2px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "2px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
        </div>
      </button>

      <button
        type="button"
        style={buttonStyle(density === "default")}
        onClick={() => onChangeDensity("default")}
        title="Default density"
      >
        <div style={lineContainerStyle}>
          <div
            style={{
              height: "3px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "3px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "3px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
        </div>
      </button>

      <button
        type="button"
        style={buttonStyle(density === "comfortable")}
        onClick={() => onChangeDensity("comfortable")}
        title="Comfortable density"
      >
        <div style={lineContainerStyle}>
          <div
            style={{
              height: "4px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "4px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              height: "3px",
              backgroundColor: "currentColor",
              borderRadius: "1px",
            }}
          />
        </div>
      </button>
    </div>
  );
}
