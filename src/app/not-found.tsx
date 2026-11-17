import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div><div className="label text-accent">404</div><h1 className="h1 mt-2">Nothing here</h1><Link href="/home" className="btn-primary mt-6">Back to Home</Link></div>
    </div>
  );
}
