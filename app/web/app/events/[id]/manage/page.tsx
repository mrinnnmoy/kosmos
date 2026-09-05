type ManageEventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ManageEventPage({
  params,
}: ManageEventPageProps) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-muted-foreground">
        Manage event {id} — coming in Commit 17
      </p>
    </main>
  );
}
