import Image from "next/image";

export function VogliaLogo({
  className,
  width = 315,
  height = 90,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/voglia-logo.svg"
      alt="Voglia Jewelry"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}

export function VogliaWordmark({
  className,
  subtitle,
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <div className={className}>
      <div className="font-wordmark text-2xl leading-none">VOGLIA</div>
      {subtitle && (
        <div className="text-[10px] tracking-[0.4em] text-muted-foreground mt-1 uppercase">
          {subtitle}
        </div>
      )}
    </div>
  );
}
