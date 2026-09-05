import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <section className="max-w-3xl text-center">
          <p className="text-sm font-medium text-primary">
            Decentralized event ticketing
          </p>
          <h1 className="mt-4 font-heading text-5xl font-bold tracking-tight">
            Discover events. <br /> Own your ticket.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Kosmos brings event discovery and blockchain-based ticket ownership
            together.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg"> Discover Events </Button>
            <Button size="lg" variant="secondary">
              Create Event
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
