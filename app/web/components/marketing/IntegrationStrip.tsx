const integrations = ["Privy", "Uniswap", "World", "ENS"] as const;

export function IntegrationStrip() {
  return (
    <section className="relative flex min-h-[70svh] items-center overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
        linear-gradient(90deg, rgba(59,130,246,0.22) 2px, transparent 2px),
        linear-gradient(rgba(59,130,246,0.22) 2px, transparent 2px)
      `,
            backgroundSize: "16px 16px",
            maskImage:
              "radial-gradient(ellipse 55% 48% at 50% 50%, black 0%, rgba(0,0,0,.75) 38%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 55% 48% at 50% 50%, black 0%, rgba(0,0,0,.75) 38%, transparent 78%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
        linear-gradient(90deg, rgba(124,58,237,0.32) 3px, transparent 3px),
        linear-gradient(rgba(124,58,237,0.32) 3px, transparent 3px)
      `,
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(circle at 30% 55%, black 0%, transparent 30%)",
            WebkitMaskImage:
              "radial-gradient(circle at 30% 55%, black 0%, transparent 30%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
        linear-gradient(90deg, rgba(236,72,153,0.28) 2px, transparent 2px),
        linear-gradient(rgba(236,72,153,0.28) 2px, transparent 2px)
      `,
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(circle at 72% 45%, black 0%, transparent 28%)",
            WebkitMaskImage:
              "radial-gradient(circle at 72% 45%, black 0%, transparent 28%)",
          }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-105 w-180 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient opacity-10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center">
        <p className="text-base text-muted-foreground sm:text-lg">
          Powered by the infrastructure behind modern on-chain experiences.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-6 sm:gap-x-16">
          {integrations.map((integration) => (
            <span
              key={integration}
              className="font-heading text-2xl font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-3xl"
            >
              {integration}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
