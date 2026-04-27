function normalizeDateTime(value: string | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10) + "T00:00";
  return value;
}

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
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required-star">*</span>}
      </span>
      <input
        type="datetime-local"
        value={normalizeDateTime(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
