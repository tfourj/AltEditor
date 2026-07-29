import { useId } from "react";

import {
  currentTimestamp,
  fromDateTimeInputValue,
  toDateTimeInputValue,
} from "../lib/dateTime";

export function DateTimeField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
        {required && <span className="required-star">*</span>}
      </label>
      <div className="datetime-field-row">
        <input
          id={inputId}
          type="datetime-local"
          step="1"
          value={toDateTimeInputValue(value)}
          aria-describedby={descriptionId}
          onChange={(event) => onChange(fromDateTimeInputValue(event.target.value))}
        />
        <button
          className="secondary datetime-now-button"
          onClick={() => onChange(currentTimestamp())}
          type="button"
        >
          Use current time
        </button>
      </div>
      <small className="timestamp-preview" id={descriptionId}>
        Saved as <code>{value || "Choose a date and time"}</code>
      </small>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  type,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required-star">*</span>}
      </span>
      {textarea ? (
        <textarea value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input value={value ?? ""} type={type ?? "text"} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
