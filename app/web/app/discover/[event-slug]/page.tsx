type EventPageProps = {
  params: Promise<{
    "event-slug": string;
  }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { "event-slug": eventSlug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-muted-foreground">
        Event {eventSlug} — coming in Commit 14
      </p>
    </main>
  );
}
