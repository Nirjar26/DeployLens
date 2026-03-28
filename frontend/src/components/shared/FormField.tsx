import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type BaseFieldProps = {
  label: string;
  helper?: string;
  error?: string;
  success?: string;
  rightAdornment?: ReactNode;
  wrapperClassName?: string;
};

type InputFieldProps = BaseFieldProps & {
  as?: "input";
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
};

type SelectFieldProps = BaseFieldProps & {
  as: "select";
  selectProps: SelectHTMLAttributes<HTMLSelectElement>;
  children: ReactNode;
};

type FormFieldProps = InputFieldProps | SelectFieldProps;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function FormField(props: FormFieldProps) {
  const stateClass = props.error
    ? "settings-field-input-error"
    : props.success
      ? "settings-field-input-success"
      : "";

  return (
    <div className={cx("settings-form-field", props.wrapperClassName)}>
      <label className="settings-form-label">{props.label}</label>

      {props.as === "select" ? (
        <div className="settings-field-control-wrap">
          <select
            {...props.selectProps}
            className={cx("settings-field-input", stateClass, props.selectProps.className)}
          >
            {props.children}
          </select>
        </div>
      ) : props.showPasswordToggle ? (
        <div className="settings-password-input-wrap">
          <input
            {...props.inputProps}
            className={cx("settings-field-input", stateClass, props.inputProps.className)}
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={props.onTogglePasswordVisibility}
            aria-label={props.isPasswordVisible ? "Hide password" : "Show password"}
          >
            {props.isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      ) : (
        <div className={cx("settings-field-control-wrap", Boolean(props.rightAdornment) && "has-adornment")}>
          <input
            {...props.inputProps}
            className={cx("settings-field-input", stateClass, props.inputProps.className)}
          />
          {props.rightAdornment ? <span className="settings-field-right-adornment">{props.rightAdornment}</span> : null}
        </div>
      )}

      {props.helper ? <p className="settings-field-helper">{props.helper}</p> : null}
      {props.error ? <p className="settings-field-message-error">{props.error}</p> : null}
      {props.success ? <p className="settings-field-message-success">{props.success}</p> : null}
    </div>
  );
}
