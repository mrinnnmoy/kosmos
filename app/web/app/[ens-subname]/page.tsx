type DashboardPageProps = {
  params: Promise<{
    "ens-subname": string;
  }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { "ens-subname": ensSubname } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-muted-foreground">
        Dashboard for {ensSubname} — coming in Commit 10
      </p>
    </main>
  );
}
