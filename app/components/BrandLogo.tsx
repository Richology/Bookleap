import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3">
      <span className="font-editorial text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
        书跃
      </span>
      <Image
        src="/brand/bookleap-monochrome.svg"
        alt="BookLeap"
        width={1810}
        height={280}
        className="h-auto w-[112px] sm:w-[160px]"
        loading="eager"
        unoptimized
      />
    </span>
  );
}
