import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
        <h1 className="text-2xl font-bold">404 — Page Not Found</h1>
        <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link href="/">
          <span className="text-primary text-sm hover:underline cursor-pointer">← Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
