import Link from "next/link";
import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DiscoverPage() {
  const allEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "draft"));

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Discover events</h1>

      {allEvents.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No events yet"
            description="Be the first to create one."
            action={
              <Link href="/create" className="text-sm text-primary underline">
                Create an event
              </Link>
            }
          />
        </div>
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
