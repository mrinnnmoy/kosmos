import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventCard } from "@/components/events/EventCard";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";

export default async function UserDashboardPage({
  params,
}: {
  params: Promise<{ "ens-subname": string }>;
}) {
  const { "ens-subname": ensSubname } = await params;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.ensSubname, ensSubname))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const hostedEvents = await db
    .select()
    .from(events)
    .where(eq(events.hostId, profile.id));

  const joinedRows = await db
    .select({ event: events })
    .from(joinRequests)
    .innerJoin(events, eq(joinRequests.eventId, events.id))
    .where(
      and(
        eq(joinRequests.userId, profile.id),
        eq(joinRequests.status, "approved")
      )
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {profile.firstName ?? ensSubname}
          </h1>

          <p className="text-muted-foreground">
            {ensSubname}.kosmos.eth
          </p>

          {profile.bio && (
            <p className="mt-2 text-sm">
              {profile.bio}
            </p>
          )}
        </div>

        <Link
          href="/create"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Create Event
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold">
          Hosted events
        </h2>

        {hostedEvents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No hosted events yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {hostedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold">
          Joined events
        </h2>

        {joinedRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No joined events yet — the join flow lands in Commit 17.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {joinedRows.map(({ event }) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
