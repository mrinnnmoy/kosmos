-- Kosmos accesses PostgreSQL through the server-side database connection.
-- Supabase Data API roles should not have direct access to application tables.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_hosts ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.join_requests FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.co_hosts FROM anon, authenticated;
