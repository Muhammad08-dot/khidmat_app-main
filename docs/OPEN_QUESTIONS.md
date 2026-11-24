# Khidmat v2.0.0 — Open Questions & Decision Log

| ID | Phase / Task | Question / Ambiguity | Context / Code Reference | Proposed Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Q-01** | P0-3 | Local Docker availability on developer host | Windows host environment does not have Docker Desktop daemon installed. Local Supabase CLI containers require Docker daemon to start locally. | Cloud Supabase is live and verified with 8 tables. `supabase/config.toml` and documentation created so any Docker-enabled environment can run `npx supabase start` + `npx supabase db reset`. Integration tests in Phase 5 will support local or live remote endpoint. | Resolved (Documented in SETUP.md) |
