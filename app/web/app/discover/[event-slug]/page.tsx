import { and, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";
import { Badge } from "@/components/ui/Badge";
import { EventJoinWorldId } from "@/components/worldid/EventJoinWorldId";
import { ipfsUrl } from "@/lib/ipfs/upload";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ "event-slug": string }>;
}) {
  const { "event-slug": eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.id, event.hostId));

  const attendees =
    event.status === "ended"
      ? await db
          .select({
            status: joinRequests.status,
            attendee: {
              firstName: users.firstName,
              lastName: users.lastName,
              ensSubname: users.ensSubname,
              linkedWallet: users.linkedWallet,
            },
          })
          .from(joinRequests)
          .innerJoin(users, eq(joinRequests.userId, users.id))
          .where(
            and(
              eq(joinRequests.eventId, event.id),
              inArray(joinRequests.status, ["approved", "checked_in"])
            )
          )
      : [];

  const startDate = new Date(event.startsAt);

  const date = startDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const time = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
            {event.coverImageCid ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ipfsUrl(event.coverImageCid)}
                alt={event.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground">
                No cover image
              </div>
            )}
          </div>

          {host?.ensSubname && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hosted by
              </p>

              <Link
                href={`/${host.ensSubname}`}
                className="mt-2 inline-block font-medium text-foreground transition-colors hover:text-primary"
              >
                {host.ensSubname}.kosmos.eth
              </Link>
            </div>
          )}
        </div>

        <div className="lg:pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {Number(event.price) > 0 ? `${event.price} ETH` : "Free"}
            </Badge>

            <span className="text-xs capitalize text-muted-foreground">
              {event.status}
            </span>
          </div>

          <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {event.name}
          </h1>

          <div className="mt-7 space-y-5">
            <div>
              <p className="text-sm font-medium text-foreground">{date}</p>
              <p className="mt-1 text-sm text-muted-foreground">{time}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Entry fee
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {Number(event.price) > 0 ? `${event.price} ETH` : "Free"}
              </p>
              {Number(event.price) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pay with ETH or a supported token.
                </p>
              )}
            </div>

            {event.location && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Location
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.location}
                </p>
              </div>
            )}
          </div>

          {event.status === "ended" ? (
            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <h2 className="font-heading text-lg font-semibold">
                Event ended
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Attendance has been finalized.
              </p>

              <div className="mt-5 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Attendees</h3>

                {attendees.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No attendees.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {attendees.map(({ attendee, status }) => {
                      const name =
                        [attendee.firstName, attendee.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        attendee.ensSubname ||
                        "Attendee";

                      return (
                        <div
                          key={attendee.linkedWallet ?? attendee.ensSubname ?? name}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{name}</p>

                            <Badge>
                              {status === "checked_in"
                                ? "Checked in"
                                : "No show"}
                            </Badge>
                          </div>

                          {attendee.linkedWallet && (
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                              {attendee.linkedWallet}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <EventJoinWorldId
                eventId={event.id}
                price={event.price}
                escrowAddress={event.escrowContractAddress}
                hostWalletAddress={host?.linkedWallet ?? null}
                startsAt={event.startsAt}
              />

              {(event.requiresApproval || Number(event.price) > 0) && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  The host reviews every request before it&apos;s confirmed.
                </p>
              )}
            </div>
          )}

          {event.description && (
            <section className="mt-8 border-t border-border pt-7">
              <h2 className="font-heading text-lg font-semibold">
                About this event
              </h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
                {event.description}
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
