export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
