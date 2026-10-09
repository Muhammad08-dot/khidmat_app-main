/**
 * In-memory Supabase-shaped mock used when EXPO_PUBLIC_DEMO_MODE === 'true'.
 *
 * Implements exactly the surface the app touches: a thenable query builder
 * (select/eq/in/order/limit/maybeSingle/single/insert/update/upsert/delete),
 * auth (session, password sign-in, signUp that mirrors the DB profile
 * trigger), realtime channels (locally emitted on writes) and storage
 * (fake public URLs). Rows come pre-joined (`customer`, `provider.profiles`,
 * `profile`, `sender`) so the existing mapping functions work unmodified.
 *
 * NOTHING here ever hits the network. Data lives for the session only.
 */

export type MockRow = Record<string, any>;

const uid = (tag: string) =>
  `${tag.padEnd(8, '0').slice(0, 8)}-0000-4000-8000-000000000000`;

const CUSTOMER_ID = uid('a1c0');
const BILAL_ID = uid('b1a1');
const NADIA_ID = uid('c4d1');
const IMRAN_ID = uid('e5f7');
const O786_ID = uid('0786');
const ADMIN_ID = uid('adm1');

const now = Date.now();
const iso = (offsetMin = 0) => new Date(now - offsetMin * 60_000).toISOString();

/* ------------------------------------------------------------------ */
/* Seed tables                                                         */
/* ------------------------------------------------------------------ */

interface MockDB {
  [table: string]: MockRow[];
}

const seed: MockDB = {
  profiles: [
    {
      id: CUSTOMER_ID, name: 'Ali Raza', phone: '+923001234567',
      email: 'demo@khidmat.app', city: 'Lahore', role: 'customer',
      photo_url: null, location_lat: 31.5204, location_lng: 74.3587,
      current_mode: 'customer', created_at: iso(60 * 24 * 30),
      addresses: [
        { id: 'a_home', label: 'Home', line: 'House 42, Street 5, DHA Phase 5, Lahore' },
        { id: 'a_office', label: 'Office', line: 'Office 7, 3rd Floor, Gulberg Galleria, Lahore' },
      ],
    },
    {
      id: BILAL_ID, name: 'Bilal Ahmed', phone: '+923215551122',
      email: 'bilal@khidmat.app', city: 'Lahore', role: 'provider',
      photo_url: null, location_lat: 31.55, location_lng: 74.32,
      current_mode: 'worker', verification_status: 'verified',
      created_at: iso(60 * 24 * 90),
    },
    {
      id: NADIA_ID, name: 'Nadia Karim', phone: '+923337778899',
      email: 'nadia@khidmat.app', city: 'Karachi', role: 'provider',
      verification_status: 'pending', created_at: iso(60 * 24 * 60),
    },
    {
      id: IMRAN_ID, name: 'Imran Shah', phone: '+923459990011',
      email: 'imran@khidmat.app', city: 'Islamabad', role: 'provider',
      verification_status: 'verified', created_at: iso(60 * 24 * 45),
    },
    {
      id: O786_ID, name: 'Usman Ali', phone: '+923111222333',
      email: 'usman@khidmat.app', city: 'Lahore', role: 'provider',
      verification_status: 'verified', created_at: iso(60 * 24 * 20),
    },
    {
      id: ADMIN_ID, name: 'Khidmat Ops', phone: '+923000000000',
      email: 'admin@khidmat.app', city: 'Lahore', role: 'admin',
      verification_status: 'verified', created_at: iso(60 * 24 * 120),
    },
  ],
  providers: [
    {
      id: BILAL_ID, category: 'Electrician', bio: 'Certified electrician, 12 years wiring & fixture experience.',
      base_price: 1500, rating: 4.8, total_jobs: 132, tier: 'Gold', available: true,
      total_earnings: 210000,
      profile: { name: 'Bilal Ahmed', phone: '+923215551122', city: 'Lahore', photo_url: null, location_lat: 31.55, location_lng: 74.32, verification_status: 'verified' },
    },
    {
      id: NADIA_ID, category: 'House Cleaner', bio: 'Deep-cleaning specialists for homes and offices.',
      base_price: 2000, rating: 4.6, total_jobs: 88, tier: 'Silver', available: true,
      total_earnings: 96000,
      profile: { name: 'Nadia Karim', phone: '+923337778899', city: 'Karachi', photo_url: null, location_lat: 24.86, location_lng: 67.01, verification_status: 'pending' },
    },
    {
      id: IMRAN_ID, category: 'Plumber', bio: 'Fast leak, pipe and fitting repairs, same-day service.',
      base_price: 1200, rating: 4.9, total_jobs: 210, tier: 'Gold', available: false,
      total_earnings: 260000,
      profile: { name: 'Imran Shah', phone: '+923459990011', city: 'Islamabad', photo_url: null, location_lat: 33.68, location_lng: 73.05, verification_status: 'verified' },
    },
    {
      id: O786_ID, category: 'AC Technician', bio: 'AC installation, servicing and gas refill expert.',
      base_price: 1800, rating: 4.4, total_jobs: 54, tier: 'Bronze', available: true,
      total_earnings: 61000,
      profile: { name: 'Usman Ali', phone: '+923111222333', city: 'Lahore', photo_url: null, location_lat: 31.51, location_lng: 74.36, verification_status: 'verified' },
    },
  ],
  categories: [
    { id: uid('c001'), name: 'Electrician', icon: 'Zap' },
    { id: uid('c002'), name: 'Plumber', icon: 'Droplets' },
    { id: uid('c003'), name: 'House Cleaner', icon: 'SprayCan' },
    { id: uid('c004'), name: 'AC Technician', icon: 'Wind' },
    { id: uid('c005'), name: 'Carpenter', icon: 'Hammer' },
    { id: uid('c006'), name: 'Painter', icon: 'Paintbrush' },
  ],
  bookings: [
    {
      id: uid('b001'), customer_id: CUSTOMER_ID, provider_id: BILAL_ID,
      category: 'Electrician', description: 'Ceiling fan installation in two bedrooms',
      status: 'confirmed', urgency: 'medium', estimated_price: 2600,
      location_lat: 31.5204, location_lng: 74.3587,
      meta: { date: '2026-10-10', timeSlot: '11:00-13:00', address: 'House 42, Street 5, DHA Phase 5, Lahore', customerName: 'Ali Raza', providerName: 'Bilal Ahmed' },
      created_at: iso(180), updated_at: iso(90),
      customer: { name: 'Ali Raza', phone: '+923001234567' },
      provider: { base_price: 1500, profiles: { name: 'Bilal Ahmed' } },
    },
    {
      id: uid('b002'), customer_id: CUSTOMER_ID, provider_id: O786_ID,
      category: 'AC Technician', description: 'Split AC servicing and gas top-up',
      status: 'completed', urgency: 'low', estimated_price: 3200,
      meta: { date: '2026-10-02', timeSlot: '15:00-17:00', address: 'Gulberg III, Lahore', customerName: 'Ali Raza', providerName: 'Usman Ali', reviewedAt: iso(60 * 24 * 6), customerRating: 4 },
      created_at: iso(60 * 24 * 7), updated_at: iso(60 * 24 * 6),
      customer: { name: 'Ali Raza', phone: '+923001234567' },
      provider: { base_price: 1800, profiles: { name: 'Usman Ali' } },
    },
    {
      id: uid('b003'), customer_id: CUSTOMER_ID, provider_id: BILAL_ID,
      category: 'Electrician', description: 'Main switchboard rewiring and breaker replacement',
      status: 'closed', urgency: 'medium', estimated_price: 4100,
      meta: { date: '2026-09-28', timeSlot: '09:00-11:00', address: 'Johar Town Block B4, Lahore', customerName: 'Ali Raza', providerName: 'Bilal Ahmed', reviewedAt: iso(60 * 24 * 11), customerRating: 5, paymentMethod: 'cod' },
      created_at: iso(60 * 24 * 12), updated_at: iso(60 * 24 * 11),
      customer: { name: 'Ali Raza', phone: '+923001234567' },
      provider: { base_price: 1500, profiles: { name: 'Bilal Ahmed' } },
    },
  ],
  messages: [
    {
      id: uid('m001'), booking_id: uid('b001'), sender_id: CUSTOMER_ID,
      content: JSON.stringify({ text: 'Assalam-o-Alaikum, can you come before 12?' }),
      created_at: iso(150), seen_at: iso(145), sender: { name: 'Ali Raza' },
    },
    {
      id: uid('m002'), booking_id: uid('b001'), sender_id: BILAL_ID,
      content: JSON.stringify({ text: 'Walaikum Assalam, yes I will reach by 11:30.' }),
      created_at: iso(140), seen_at: iso(138), sender: { name: 'Bilal Ahmed' },
    },
    {
      id: uid('m003'), booking_id: uid('b001'), sender_id: BILAL_ID,
      content: JSON.stringify({ text: 'Worker accepted the booking request and has marked it as CONFIRMED.', isSystemEvent: true, eventStatus: 'confirmed' }),
      created_at: iso(90), seen_at: null, sender: { name: 'Bilal Ahmed' },
    },
  ],
  notifications: [
    { id: uid('n001'), user_id: CUSTOMER_ID, type: 'job_accepted', message: 'Your booking request has been accepted by Bilal Ahmed!', booking_id: uid('b001'), read: false, created_at: iso(90) },
    { id: uid('n002'), user_id: CUSTOMER_ID, type: 'job_completed', message: 'Worker Usman Ali has marked your job complete. Please review & confirm completion.', booking_id: uid('b002'), read: true, created_at: iso(60 * 24 * 6) },
    { id: uid('n003'), user_id: BILAL_ID, type: 'invitation', message: 'Ali Raza in Lahore requested Electrician services.', booking_id: null, read: false, created_at: iso(200) },
  ],
  payments: [
    { id: uid('p001'), booking_id: uid('b003'), payer_id: CUSTOMER_ID, method: 'cod', amount: 4100, status: 'completed', reference: null, created_at: iso(60 * 24 * 11) },
  ],
  reviews: [
    { id: uid('r001'), booking_id: uid('b003'), provider_id: BILAL_ID, reviewer_id: CUSTOMER_ID, rating: 5, comment: 'Very professional, fixed the wiring issue in 30 minutes.', created_at: iso(60 * 24 * 10), is_hidden: false, reviewer: { name: 'Ali Raza' } },
    { id: uid('r002'), booking_id: uid('b004'), provider_id: BILAL_ID, reviewer_id: uid('cu002'), rating: 4, comment: 'On time and polite. Fair pricing.', created_at: iso(60 * 24 * 20), is_hidden: false, reviewer: { name: 'Sana Khan' } },
    { id: uid('r003'), booking_id: uid('b005'), provider_id: BILAL_ID, reviewer_id: uid('cu003'), rating: 5, comment: null, created_at: iso(60 * 24 * 33), is_hidden: false, reviewer: { name: 'Imran Sheikh' } },
  ],
  provider_locations: [
    { provider_id: BILAL_ID, booking_id: uid('b001'), lat: 31.545, lng: 74.335, updated_at: iso(5) },
  ],
  push_tokens: [],
};

const AUTH_USERS = [
  { id: CUSTOMER_ID, email: 'demo@khidmat.app', password: '123456', role: 'customer', name: 'Ali Raza' },
  { id: BILAL_ID, email: 'bilal@khidmat.app', password: '123456', role: 'provider', name: 'Bilal Ahmed' },
  { id: ADMIN_ID, email: 'admin@khidmat.app', password: '123456', role: 'admin', name: 'Khidmat Ops' },
];

/* ------------------------------------------------------------------ */
/* Core store + change emitter                                         */
/* ------------------------------------------------------------------ */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const genId = () => uid((Math.floor(Math.random() * 0xffffffff) >>> 0).toString(16));

type ChangeListener = (payload: { table: string; eventType: string; new: MockRow; old: MockRow | null }) => void;
const listeners = new Set<ChangeListener>();
const emit = (table: string, eventType: string, newRow: MockRow, oldRow: MockRow | null) => {
  setTimeout(() => listeners.forEach((l) => l({ table, eventType, new: clone(newRow), old: oldRow ? clone(oldRow) : null })), 5);
};

/* ------------------------------------------------------------------ */
/* Thenable query builder                                              */
/* ------------------------------------------------------------------ */

class QueryError extends Error {}

class Builder {
  private filters: Array<[string, string, any]> = [];
  private orderSpec: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: MockRow | MockRow[] | null = null;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private returning = false;

  constructor(private table: string, private db: MockDB) {}

  select(_cols?: string) { this.returning = true; return this; }
  eq(col: string, val: any) { this.filters.push([col, 'eq', val]); return this; }
  neq(col: string, val: any) { this.filters.push([col, 'neq', val]); return this; }
  is(col: string, val: any) { this.filters.push([col, 'is', val]); return this; }
  in(col: string, vals: any[]) { this.filters.push([col, 'in', vals]); return this; }
  gte(col: string, val: any) { this.filters.push([col, 'gte', val]); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.wantSingle = true; return this; }
  maybeSingle() { this.wantMaybeSingle = true; return this; }

  insert(row: MockRow) { this.mode = 'insert'; this.payload = row; return this; }
  update(patch: MockRow) { this.mode = 'update'; this.payload = patch; return this; }
  upsert(row: MockRow) { this.mode = 'upsert'; this.payload = row; return this; }
  delete() { this.mode = 'delete'; return this; }

  private match(row: MockRow): boolean {
    return this.filters.every(([col, op, val]) => {
      if (op === 'eq') return String(row[col]) === String(val);
      if (op === 'neq') return String(row[col]) !== String(val);
      if (op === 'is') return val === null ? row[col] == null : row[col] === val;
      if (op === 'in') return Array.isArray(val) && val.map(String).includes(String(row[col]));
      if (op === 'gte') return row[col] >= val;
      return true;
    });
  }

  private run(): { data: any; error: Error | null } {
    try {
      const rows = this.db[this.table];
      if (!rows) throw new QueryError(`mock: unknown table "${this.table}"`);

      if (this.mode === 'select') {
        let out = rows.filter((r) => this.match(r));
        if (this.orderSpec) {
          const { col, ascending } = this.orderSpec;
          out = [...out].sort((a, b) => {
            const av = a[col] ?? '';
            const bv = b[col] ?? '';
            return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
          });
        }
        if (this.limitN != null) out = out.slice(0, this.limitN);
        const data = clone(out);
        if (this.wantMaybeSingle) return { data: data[0] ?? null, error: null };
        if (this.wantSingle) {
          if (!data.length) throw new QueryError('mock: no rows returned for single()');
          return { data: data[0], error: null };
        }
        return { data, error: null };
      }

      if (this.mode === 'insert') {
        const row = this.payload as MockRow;
        const full: MockRow = {
          id: row.id ?? genId(),
          created_at: iso(0),
          ...row,
        };
        rows.push(full);
        emit(this.table, 'INSERT', full, null);
        return { data: this.returning ? clone(full) : null, error: null };
      }

      if (this.mode === 'upsert') {
        const row = this.payload as MockRow;
        const pk = row.id ?? null;
        const idx = pk != null ? rows.findIndex((r) => String(r.id) === String(pk)) : -1;
        if (idx >= 0) {
          const before = rows[idx];
          const profileJoin = before.profile; // providers keep their joined profile
          rows[idx] = { ...before, ...row, profile: profileJoin ?? row.profile };
          emit(this.table, 'UPDATE', rows[idx], before);
          return { data: this.returning ? clone(rows[idx]) : null, error: null };
        }
        const full: MockRow = { created_at: iso(0), ...row };
        if (!full.id) full.id = genId();
        rows.push(full);
        emit(this.table, 'INSERT', full, null);
        return { data: this.returning ? clone(full) : null, error: null };
      }

      if (this.mode === 'update') {
        const patch = this.payload as MockRow;
        const targets = rows.filter((r) => this.match(r));
        targets.forEach((r) => Object.assign(r, patch, { updated_at: iso(0) }));
        targets.forEach((r) => emit(this.table, 'UPDATE', r, r));
        return { data: this.returning ? clone(targets) : null, error: null };
      }

      if (this.mode === 'delete') {
        const doomed = rows.filter((r) => this.match(r));
        this.db[this.table] = rows.filter((r) => !this.match(r));
        doomed.forEach((r) => emit(this.table, 'DELETE', r, r));
        return { data: this.returning ? clone(doomed) : null, error: null };
      }

      throw new QueryError(`mock: unsupported mode ${this.mode}`);
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  // Thenable: awaiting the builder executes the query.
  then<TResult1 = { data: any; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/* ------------------------------------------------------------------ */
/* Auth + channel + storage surfaces                                   */
/* ------------------------------------------------------------------ */

const makeSession = (u: { id: string; email: string; name?: string; role?: string }) => ({
  access_token: `mock-token-${u.id}`,
  token_type: 'bearer',
  expires_in: 3600,
  user: {
    id: u.id,
    email: u.email,
    user_metadata: { name: u.name ?? '', role: u.role ?? 'customer' },
    created_at: iso(0),
  },
});

export function createMockSupabase() {
  let currentSession: ReturnType<typeof makeSession> | null = null;
  const authListeners = new Set<(event: string, session: any) => void>();
  const notifyAuth = (event: string, session: any) =>
    authListeners.forEach((cb) => setTimeout(() => cb(event, session), 5));

  const db: MockDB = clone(seed);

  const api = {
    from(table: string) {
      return new Builder(table, db);
    },

    auth: {
      async getSession() {
        await new Promise((r) => setTimeout(r, 15));
        return { data: { session: currentSession }, error: null };
      },
      async getUser() {
        return { data: { user: currentSession?.user ?? null }, error: currentSession ? null : new QueryError('not logged in') };
      },
      onAuthStateChange(cb: (event: string, session: any) => void) {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        await new Promise((r) => setTimeout(r, 120));
        const found = AUTH_USERS.find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!found || found.password !== password) {
          return { data: null, error: new QueryError('Invalid login credentials') };
        }
        currentSession = makeSession(found);
        notifyAuth('SIGNED_IN', currentSession);
        return { data: { session: currentSession, user: currentSession.user }, error: null };
      },
      async signUp({ email, password, options }: any) {
        await new Promise((r) => setTimeout(r, 150));
        if (AUTH_USERS.some((x) => x.email.toLowerCase() === String(email).toLowerCase())) {
          return { data: null, error: new QueryError('User already registered') };
        }
        const meta = options?.data ?? {};
        const id = genId();
        AUTH_USERS.push({ id, email, password, role: meta.role ?? 'customer', name: meta.name ?? '' });
        const profileRow: MockRow = {
          id, name: meta.name ?? 'New User', phone: meta.phone ?? '', email,
          city: meta.city ?? '', role: meta.role ?? 'customer',
          location_lat: meta.location_lat ?? 0, location_lng: meta.location_lng ?? 0,
          current_mode: meta.role === 'provider' ? 'worker' : 'customer',
          verification_status: 'pending', created_at: iso(0),
        };
        db.profiles.push(profileRow);
        if (meta.role === 'provider') {
          db.providers.push({
            id, category: meta.category ?? 'General', bio: meta.bio ?? '',
            base_price: meta.basePrice ?? 1000, rating: 0, total_jobs: 0,
            tier: 'Bronze', available: false, total_earnings: 0,
            profile: { ...profileRow },
          });
        }
        // Demo mode simulates "Confirm email = OFF": return the session directly.
        currentSession = makeSession({ id, email, name: meta.name, role: meta.role });
        notifyAuth('SIGNED_IN', currentSession);
        return { data: { session: currentSession, user: currentSession.user }, error: null };
      },
      async signOut() {
        currentSession = null;
        notifyAuth('SIGNED_OUT', null);
        return { error: null };
      },
      async resetPasswordForEmail(_email: string, _opts?: any) {
        return { data: {}, error: null };
      },
      async updateUser({ password }: { password?: string }) {
        if (currentSession && password) {
          const u = AUTH_USERS.find((x) => x.id === currentSession!.user.id);
          if (u) u.password = password;
        }
        return { data: { user: currentSession?.user ?? null }, error: null };
      },
      async signInWithOtp({ phone }: any) {
        return { data: {}, error: null };
      },
      async verifyOtp(params: any) {
        if (params?.type === 'sms' && params?.token === '123456') {
          const found = AUTH_USERS.find((x) => x.email === 'demo@khidmat.app')!;
          currentSession = makeSession(found);
          notifyAuth('SIGNED_IN', currentSession);
          return { data: { session: currentSession }, error: null };
        }
        if (params?.type === 'recovery') {
          return { data: null, error: new QueryError('Demo mode: open the reset link from a real email.') };
        }
        return { data: null, error: new QueryError('Invalid or expired code (use 123456 in demo).') };
      },
    },

    channel(_name: string) {
      const bindings: Array<{ filter: any; cb: (p: any) => void }> = [];
      const forward = (payload: any) => {
        bindings.forEach(({ filter, cb }) => {
          if (!filter?.table || filter.table === payload.table) {
            cb({ eventType: payload.eventType, table: payload.table, new: payload.new, old: payload.old });
          }
        });
      };
      const ch = {
        on(_type: string, filter: any, cb: (p: any) => void) {
          bindings.push({ filter, cb });
          return ch;
        },
        subscribe(cb?: (s: string) => void) {
          listeners.add(forward);
          setTimeout(() => cb?.('SUBSCRIBED'), 10);
          return ch;
        },
        unsubscribe() {
          listeners.delete(forward);
          return Promise.resolve();
        },
      };
      return ch;
    },
    removeChannel(ch: any) {
      ch?.unsubscribe?.();
    },

    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, _blob: any, _opts?: any) {
            await new Promise((r) => setTimeout(r, 80));
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://mock.assets.local/${_bucket ?? 'bucket'}/${path}` } };
          },
        };
      },
    },
  };

  return api as any;
}
