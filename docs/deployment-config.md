# Deployment configuration

The current prototype runs without Supabase variables and remains disconnected. When a reviewed backend integration is ready, set configuration through the deployment platform's secure environment-variable interface:

| Variable | Intended use | Public to browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes; public endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key paired with RLS | Yes; public key, not an authorization bypass |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server or Edge Function only, if required | **No** |

Do not paste production values into source code, Markdown, `VITE_*` secrets, or committed environment files. The service-role key, database password, and signing secrets must be kept in server-side secret storage and must never be bundled into the frontend.

Before building for production, configure the required OAuth redirect URLs and provider settings in Supabase, implement server-side `verify_student`, save, submit, staff, and audit operations, and test RLS against the cases in [the integration guide](supabase-integration.md). This frontend must not be switched from demo mode until that security review is complete.
