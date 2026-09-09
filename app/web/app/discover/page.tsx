import Link from "next/link";
import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { EventCard } from "@/components/events/EventCard";

export default async function DiscoverPage() {
  const allEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "draft"));

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Discover events</h1>

      {allEvents.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No events yet — be the first to{" "}
          <Link href="/create" className="text-primary underline">
            create one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
