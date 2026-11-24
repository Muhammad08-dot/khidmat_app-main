# Security & Row Level Security (RLS) Specification — Khidmat v2.0.0

**Task Reference:** PRD v2 Phase 3 (P3-4)  
**Document Status:** Complete Audit Matrix & Policy Verification  
**Enforcement:** PostgreSQL RLS + Security Definer Functions + Triggers

---

## 1. Security Philosophy & Principles

1. **Least Privilege Client Access:** The mobile client connects using the public Supabase `anon` key. No elevated service role keys are bundled or exposed.
2. **Postgres-Enforced Boundaries:** All tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Data access policies are evaluated inside the database kernel.
3. **No Direct PII Exposure:** Personal identification numbers (CNIC) and phone numbers are isolated from public browse tables. Phone numbers reside in `profile_contacts` (accessible only by self, admin, or booking counterparties). CNICs and ID documents reside in private storage `kyc-documents`.
4. **Immutable Audit Trails:** Sensitive system mutations (moderation, account deletion, KYC review) append records to `admin_actions`, which is strictly append-only (triggers forbid UPDATE and DELETE).
5. **Anti-Self-Escalation:** Users cannot modify their own `role` column to `'admin'` or change role permissions (`0014_rls_hardening.sql`).
6. **Price Lock After Acceptance:** Once a booking moves from `'pending'` to `'confirmed'` or beyond, neither party can alter the agreed price.

---

## 2. Table × Role × Operation Access Matrix

| Table | Anon | Customer | Provider | Platform Admin | Enforcing Policy / Trigger |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`profiles`** | SELECT (public fields) | SELECT, UPDATE (own row, role locked) | SELECT, UPDATE (own row, role locked) | ALL | `Profiles viewable by everyone`, `Users can update own profile`, `trg_prevent_role_escalation` (0014) |
| **`profile_contacts`** | ❌ None | SELECT (self + counterparty) | SELECT (self + counterparty) | ALL | `Contacts visible to owner, admin, or booking counterparties` (0008) |
| **`providers`** | SELECT (verified only) | SELECT (all verified) | SELECT, UPDATE (own row) | ALL | `Providers viewable by everyone`, `Admins can moderate providers` (0007) |
| **`bookings`** | ❌ None | SELECT, INSERT, UPDATE (own) | SELECT, UPDATE (assigned) | ALL | `View involved bookings` (0014), `trg_booking_status_transition` (0009), `trg_prevent_price_tampering` (0014) |
| **`messages`** | ❌ None | SELECT, INSERT (involved) | SELECT, INSERT (involved) | SELECT (involved) | `View booking messages` (0014), `Insert booking messages` (0001) |
| **`reviews`** | SELECT (unhidden) | SELECT, INSERT (own booking) | SELECT (unhidden) | ALL (hide, delete) | `Reviews viewable by everyone` (is_hidden = false OR is_admin), `Admins can moderate reviews` (0007) |
| **`payments`** | ❌ None | SELECT, INSERT (involved) | SELECT (involved) | ALL | `View involved payments`, `Insert involved payments` (0003) |
| **`notifications`** | ❌ None | SELECT, UPDATE (own row) | SELECT, UPDATE (own row) | ALL | `Users can view own notifications`, `Users can update own notifications` (0002, 0008) |
| **`push_tokens`** | ❌ None | ALL (own user_id) | ALL (own user_id) | ALL | `Users can manage own push tokens` (0001) |
| **`saved_addresses`** | ❌ None | ALL (own user_id) | ALL (own user_id) | ALL | `Users can manage own addresses` (0006) |
| **`user_reports`** | ❌ None | INSERT (reporter_id = auth.uid()) | INSERT (reporter_id = auth.uid()) | ALL (view, resolve) | `Users can submit reports`, `Admins can view and manage all reports` (0012) |
| **`admin_actions`** | ❌ None | ❌ None | ❌ None | INSERT, SELECT (Append-Only) | `Admins can insert audit logs`, `Admins can view audit logs`, `trg_admin_actions_immutable` (0008, 0014) |
| **`storage: avatars`** | SELECT | ALL (own folder) | ALL (own folder) | ALL | `Avatars publicly readable`, `Users can upload own avatar` (0002) |
| **`storage: job_media`** | ❌ None | SELECT, INSERT (involved) | SELECT, INSERT (involved) | ALL | `Job media involved party read/upload` (0003, 0008) |
| **`storage: kyc-documents`**| ❌ None | ❌ None | ALL (own folder) | SELECT, DELETE | `Owner can upload KYC documents`, `Owner and admin can read KYC documents` (0013) |

---

## 3. High-Risk Attack Surface Analysis & Hardened Countermeasures

### 3.1 Role Escalation Attack
- **Attack Vector:** An authenticated user submits `PATCH /rest/v1/profiles?id=eq.<user_id>` with payload `{"role": "admin"}`.
- **Countermeasure:** `trg_prevent_role_escalation` (Migration 0014) rejects any UPDATE modifying `role` unless `public.is_admin()` returns true, throwing SQLSTATE `42501`.

### 3.2 Price Tampering Attack
- **Attack Vector:** A customer accepts a booking at PKR 1,500, and later updates `estimated_price` or `total_price` to PKR 100 before payment.
- **Countermeasure:** `trg_prevent_price_tampering` (Migration 0014) inspects `OLD.status`. If `OLD.status != 'pending'`, mutating `estimated_price` or `total_price` throws SQLSTATE `22023`.

### 3.3 State Machine Bypass & Acceptance Race
- **Attack Vector:** Two providers attempt to accept the same booking simultaneously, or a client marks an unaccepted booking as `completed`.
- **Countermeasure:** `public.transition_booking_status(...)` (Migration 0009, 0014) acquires a row-level lock (`SELECT ... FOR UPDATE`), strictly asserts expected current status, verifies caller authorization (customer, assigned provider, or admin), and enforces valid lifecycle transitions.

### 3.4 Cross-User Read & Communication Eavesdropping
- **Attack Vector:** A malicious customer or provider queries `/rest/v1/bookings` or `/rest/v1/messages` without scoping to read other users' sensitive service requests and chat history.
- **Countermeasure:** Explicit SELECT RLS policies (`View involved bookings`, `View booking messages`, `Customer reads provider location`) restrict query results strictly to `customer_id = auth.uid() OR provider_id = auth.uid() OR is_admin()`. Uninvolved parties receive zero rows.

### 3.5 PII & Phone Number Scraping
- **Attack Vector:** An unauthenticated or unauthorized party scrapes phone numbers of clients and service providers.
- **Countermeasure:** Phone numbers are separated into `profile_contacts` (Migration 0008). A user can only read another user's contact information if they have an active or accepted booking together.

### 3.6 Identity Document (CNIC) Exposure
- **Attack Vector:** An attacker guesses file URLs in storage to access government-issued ID cards.
- **Countermeasure:** `kyc-documents` bucket is private (`public = false`). Direct access is blocked. Signed URLs with short expiration are required and restricted to document owner and platform administrators (Migration 0013).

### 3.7 Audit Log Tampering & Deletion
- **Attack Vector:** A compromised administrator attempts to DELETE or UPDATE past moderation actions in `admin_actions` to hide malicious activity.
- **Countermeasure:** `trg_admin_actions_immutable` (Migration 0014) forbids any UPDATE or DELETE operations on `admin_actions`, throwing SQLSTATE `42501`. Permissions on UPDATE/DELETE are revoked for all roles.
