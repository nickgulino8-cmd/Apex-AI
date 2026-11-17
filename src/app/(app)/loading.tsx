export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-32" /><div className="skeleton h-32" /></div>
    </div>
  );
}
