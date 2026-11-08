import Image from "next/image";

export function BrandLogo({ variant = "monochrome" }: { variant?: "color" | "monochrome" }) {
  return (
    <span className="inline-flex shrink-0 items-center leading-none">
      <Image
        src={`/brand/bookleap-lockup-${variant}.png`}
        alt="BookLeap 书跃"
        width={1920}
        height={240}
        className="block h-auto w-[160px] sm:w-[224px]"
        loading="eager"
        unoptimized
      />
    </span>
  );
}
