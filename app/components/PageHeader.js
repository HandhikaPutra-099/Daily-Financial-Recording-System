export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.65rem] font-semibold tracking-[-0.035em] text-[#f4f5f7] sm:text-3xl">
          {title}
        </h1>
      {subtitle && (
          <p className="mt-1.5 text-sm text-[#a1a5b7]">{subtitle}</p>
      )}
      </div>
    </div>
  );
}
