type CheckInPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-muted-foreground">
        Check-in scanner for event {id} — coming in Commit 21
      </p>
    </main>
  );
}
