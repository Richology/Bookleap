import Image from "next/image";
import colorLogo from "@/public/brand/bookleap-lockup-color.webp";
import monochromeLogo from "@/public/brand/bookleap-lockup-monochrome.webp";

export function BrandLogo({ variant = "monochrome" }: { variant?: "color" | "monochrome" }) {
  // Pre-sized for 3x displays; static imports provide hashed URLs for immutable caching.
  return (
    <span className="inline-flex shrink-0 items-center leading-none">
      <Image
        src={variant === "color" ? colorLogo : monochromeLogo}
        alt="BookLeap 书跃"
        className="block h-auto w-[160px] sm:w-[224px]"
        loading="eager"
        fetchPriority="high"
        unoptimized
      />
    </span>
  );
}
