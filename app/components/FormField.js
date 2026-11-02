export default function FormField({ id, label, helper, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[#f4f5f7]"
      >
        {label}
      </label>
      {children}
      {helper && (
        <p className="mt-1 text-xs text-[#8a8ea4]">{helper}</p>
      )}
    </div>
  );
}
