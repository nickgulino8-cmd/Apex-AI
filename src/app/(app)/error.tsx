"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card card-pad mx-auto max-w-md text-center">
      <h2 className="h2">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">This part of the page failed to load. Your data is safe.</p>
      <button onClick={reset} className="btn-primary mt-5">Try again</button>
    </div>
  );
}
