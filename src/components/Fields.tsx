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
