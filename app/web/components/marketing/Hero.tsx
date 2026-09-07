import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/Button";

const floatingCards = [
  {
    src: "/events/riverside-run.png",
    alt: "Riverside Run event",
    className:
      "left-[4%] top-[12%] -rotate-3 xl:left-[7%]",
  },
  {
    src: "/events/dinner-table.png",
    alt: "Dinner Table event",
    className:
      "left-[13%] bottom-[7%] rotate-3 xl:left-[16%]",
  },
  {
    src: "/events/build-together.png",
    alt: "Build Together event",
    className:
      "right-[5%] top-[11%] rotate-3 xl:right-[8%]",
  },
  {
    src: "/events/night-market.png",
    alt: "Night Market event",
    className:
      "right-[14%] bottom-[6%] -rotate-3 xl:right-[17%]",
  },
  {
    src: "/events/ideas-in-person.png",
    alt: "Ideas in Person event",
    className:
      "left-[1%] top-[52%] -translate-y-1/2 rotate-2 xl:left-[3%]",
  },
  {
    src: "/events/art-space.png",
    alt: "Art Space event",
    className:
      "right-[1%] top-[52%] -translate-y-1/2 -rotate-2 xl:right-[3%]",
  },
] as const;

export function Hero() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute left-[12%] top-[20%] h-72 w-72 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute right-[12%] top-[20%] h-72 w-72 rounded-full bg-violet-600/10 blur-3xl"
      />

      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {floatingCards.map((card) => (
          <div
            key={card.src}
            className={`absolute w-[118px] xl:w-[136px] ${card.className}`}
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
              <Image
                src={card.src}
                alt={card.alt}
                width={395}
                height={448}
                className="h-auto w-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-3xl items-center justify-center px-5 py-20 text-center">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Tickets backed by escrow,
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              not promises.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Every ticket payment sits in an on-chain escrow until the event
            actually happens. Verified attendees, refunds that execute
            automatically, and an NFT as proof you were there.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signin">Get Started</Link>
            </Button>

            <Button asChild variant="secondary" size="lg">
              <Link href="/discover">Discover Events</Link>
            </Button>
          </div>

          <div className="mx-auto mt-14 grid max-w-[330px] grid-cols-3 gap-3 lg:hidden">
            {floatingCards.slice(0, 3).map((card, index) => (
              <div
                key={card.src}
                className={`overflow-hidden rounded-xl border border-white/10 shadow-xl ${
                  index === 1 ? "-translate-y-3" : ""
                }`}
              >
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={395}
                  height={448}
                  className="h-auto w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
