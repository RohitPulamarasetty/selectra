import Image from "next/image";

export function CampusPhoto({ alt, sizes, hero = false }: { alt: string; sizes: string; hero?: boolean }) {
  return <picture>
    <source srcSet="/selectra-campus-small.webp 560w, /selectra-campus.webp 1120w" sizes={sizes} />
    <Image src="/selectra-campus.webp" alt={alt} unoptimized fill loading="eager" fetchPriority={hero ? "high" : undefined} />
  </picture>;
}
