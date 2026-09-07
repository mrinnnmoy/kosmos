import Link from "next/link";
import { Mail } from "lucide-react";

const productLinks = [
  { label: "Discover", href: "/discover" },
  { label: "Create an event", href: "/create" },
  { label: "Sign in", href: "/signin" },
];

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5 4l14 16" />
      <path d="M19 4L5 20" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="flex min-h-[30svh] items-center">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <span className="font-heading text-lg font-bold">Kosmos</span>

            <p className="mt-2 text-sm text-muted-foreground">
              Tickets backed by escrow, not promises.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:flex sm:gap-16">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Product
              </h4>

              <ul className="mt-3 space-y-2">
                {productLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Legal
              </h4>

              <ul className="mt-3 space-y-2">
                {legalLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5 text-muted-foreground">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="flex h-5 w-5 items-center justify-center transition-colors hover:text-foreground"
            >
              <InstagramIcon />
            </a>

            <a
              href="https://x.com"
              aria-label="X"
              className="flex h-5 w-5 items-center justify-center transition-colors hover:text-foreground"
            >
              <XIcon />
            </a>

            <a
              href="mailto:hello@kosmos.eth"
              aria-label="Email"
              className="flex h-5 w-5 items-center justify-center transition-colors hover:text-foreground"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Kosmos.
          </p>
        </div>
      </div>
    </footer>
  );
}
