import Image from "next/image";

export default function BrandLockup({
  size = 40,
  showTagline = false,
  textClassName = "",
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <Image
        src="/duetku-mark.svg"
        width={size}
        height={size}
        alt=""
        unoptimized
      />
      <span className={`min-w-0 text-left ${textClassName}`}>
        <span className="block truncate text-sm font-semibold tracking-tight text-[#f4f5f7] sm:text-base">
          DuetKu
        </span>
        {showTagline && (
          <span className="block truncate text-[11px] leading-4 text-[#8a8ea4]">
            Keuangan pribadi, lebih terarah.
          </span>
        )}
      </span>
    </span>
  );
}
