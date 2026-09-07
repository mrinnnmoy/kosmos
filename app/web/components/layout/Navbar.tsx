import Link from "next/link";

import { Button } from "@/components/ui/Button";

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-xl font-bold">
          Kosmos
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/discover"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Discover Events
          </Link>

          <Button asChild size="sm">
            <Link href="/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
