import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ipfsUrl } from "@/lib/ipfs/upload";
import type { KosmosEvent } from "@kosmos/shared";

type EventCardEvent = Omit<KosmosEvent, "startsAt" | "endsAt" | "createdAt"> & {
  startsAt: string | Date;
  endsAt: string | Date;
  createdAt: string | Date;
};

export function EventCard({
  event,
  footer,
}: {
  event: EventCardEvent;
  footer?: ReactNode;
}) {
  const date = new Date(event.startsAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary">
      <Link href={`/discover/${event.id}`} className="group block">
        <div className="aspect-video w-full bg-border">
          {event.coverImageCid && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ipfsUrl(event.coverImageCid)}
              alt={event.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="p-4">
          <h3 className="font-heading font-semibold">{event.name}</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {date}
            {event.location ? ` · ${event.location}` : ""}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <Badge>
              {Number(event.price) > 0 ? `${event.price} ETH` : "Free"}
            </Badge>

            <span className="text-xs capitalize text-muted-foreground">
              {event.status}
            </span>
          </div>
        </div>
      </Link>

      {footer && (
        <div className="border-t border-border p-3">
          {footer}
        </div>
      )}
    </div>
  );
}
