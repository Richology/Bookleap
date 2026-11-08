import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap leading-none sm:gap-3">
      <Image
        src="/brand/bookleap-monochrome.svg"
        alt="BookLeap"
        width={1810}
        height={280}
        className="relative top-px block h-auto w-[112px] sm:w-[160px]"
        loading="eager"
        unoptimized
      />
      <span className="bg-linear-to-br from-[#777] via-[#555] to-[#242424] bg-clip-text font-sans text-[17px] leading-none font-semibold tracking-[0.04em] text-transparent sm:text-[23px]">
        书跃
      </span>
    </span>
  );
}
