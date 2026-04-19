# Waqt-e-Namaz — Complete Implementation Prompt for AI Agent

> **Read this entire document before touching a single file. Every decision here is deliberate. Do not improvise.**

---

## 0. Who You Are and What This Is

You are implementing a full-stack web application called **Waqt-e-Namaz** — a prayer times platform for mosques in Karachi, Pakistan, built by a 20-year-old solo developer on zero budget. The stack is:

- **Frontend**: React 19 + Vite 8, pure CSS (no Tailwind), deployed on Vercel
- **Backend**: Node.js + Express 5, ES modules (`"type": "module"`), deployed on Render.com
- **Database**: Supabase PostgreSQL (public schema)
- **Push**: web-push (VAPID), BullMQ + ioredis (Upstash Redis)
- **Package manager**: pnpm (both client and server)

The project has a `client/` folder and a `server/` folder at root. Both are independent pnpm workspaces.

---

## 1. Current State — What Exists, What Is Broken, What Is Missing

### 1.1 What Works (Do Not Break These)

- Custom JWT auth (`bcryptjs` + `jsonwebtoken`) — login, register, `/api/auth/me`
- Role system: `super_admin`, `admin`, `imam`, `user` — stored in `users.role`
- Mosque CRUD — create, deactivate, geo endpoints
- Prayer times update + audit log write
- Eid prayer posting
- Push subscription (subscribe/unsubscribe/my-subscriptions)
- Service worker (push notifications only — caching deliberately removed)
- i18n system (en/ur/ar) with RTL flip
- 4-theme CSS system (light/dark/warm/midnight)
- All UI components: Button, Card, Badge, Skeleton, Toast, BottomNav, TopBar
- MosqueCard with next prayer countdown
- Home, Nearby, MosqueDetail, Subscriptions, Settings pages

### 1.2 What Is Broken (Fix These)

#### BUG-1: Vite HMR WebSocket error in development
**File**: `client/vite.config.js`
**Problem**: Missing HMR config causes WebSocket connection failures in dev console.
**Fix**: Add `server: { hmr: { protocol: 'ws', host: 'localhost' } }` to the Vite config.

#### BUG-2: Role string inconsistency — `city_admin` vs `admin`
**Problem**: Some server routes use `requireRole('city_admin', ...)` but the DB stores `'admin'`. This causes 403s for legitimate city admins.
**Affected files**: `server/routes/mosques.js`, `server/routes/admin.js`
**Fix**: Replace every instance of `'city_admin'` with `'admin'` in `requireRole()` calls and any role comparison logic. The DB stores `'admin'` — that is the source of truth.

#### BUG-3: Login requires phone but phone is not a login credential
**Problem**: `server/routes/auth.js` login handler checks `user.phone !== phone`, making login fail if the user doesn't remember their phone. Phone is collected at registration only — it is not a login factor.
**Fix**: Remove the `phone` field from the login request body validation and remove the `user.phone !== phone` check. Login is email + password only. Keep phone in the register route.

#### BUG-4: `POST /api/admin/users` references undefined variable `dbRole`
**Problem**: In `server/routes/admin.js`, the route `POST /api/admin/users` uses a variable `dbRole` which is never defined — `role` is destructured from `req.body` but then it's used as `dbRole`. This causes a ReferenceError crash.
**Fix**: After destructuring `role` from `req.body`, add:
```js
const dbRole = role === 'city_admin' ? 'admin' : role
```
Then use `dbRole` consistently throughout that route.

#### BUG-5: `GET /api/admin/my-stats` uses wrong role string
**Problem**: Route uses `requireRole('city_admin', 'super_admin')` — should be `'admin'`.

#### BUG-6: `POST /api/admin/areas` uses wrong role string
**Problem**: Route uses `requireRole('super_admin', 'city_admin')` — should be `'admin'`.

#### BUG-7: Mosque visibility — incomplete prayer times not filtered
**Problem**: `GET /api/mosques` returns all active mosques including those with missing prayer times. The spec requires mosques with any missing prayer time (fajr, zuhr, asr, isha, jumma, maghrib_auto=true means maghrib is auto so don't filter on it) to be hidden from public users.
**Fix**: In `server/routes/mosques.js`, after fetching mosques, filter out any mosque where `prayer_times` has any null value among `[fajr, zuhr, asr, isha, jumma]`. All five must be non-null for the mosque to be visible. Admins and imams bypass this filter (check `req.user` exists and has role `admin`, `imam`, or `super_admin`).

#### BUG-8: SignIn.jsx requires phone field
**Problem**: `client/src/pages/public/SignIn.jsx` has a phone input field and validates it on submit. Phone is not a login factor.
**Fix**: Remove the phone input field and its state from SignIn.jsx entirely. Login form is email + password only.

#### BUG-9: `AuthContext` — the `/api/auth/me` fetch on mount has no error recovery
**Problem**: If Render.com server is cold-starting (takes ~30s), the `/api/auth/me` fetch times out or returns an error, and `signOut()` is called, logging the user out. This causes the "Ctrl+R logs you out" bug.
**Fix**: Only call `signOut()` if the response is specifically `401`. For network errors or `5xx`, just call `setLoading(false)` and keep the user logged in using the stored token. Add a try-catch: network errors should not log the user out.

```js
// In AuthContext useEffect:
fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
  .then(res => {
    if (res.status === 401) signOut()
    // any other status: keep user logged in
  })
  .catch(() => {
    // network error (server cold start, offline): keep user logged in
  })
  .finally(() => setLoading(false))
```

### 1.3 What Is Missing (Implement These)

These are new features. Implement them in the order listed. Each section is a sprint.

---

## 2. Database Changes Required

Run these SQL statements in the Supabase SQL editor **before** implementing any backend routes. The agent does not execute SQL — document these for the developer to run manually, but reference the new columns/tables in your code.

### 2.1 Add `device_subscriptions` table (already exists in DB — verify columns match)

The DB already has this table. Verify it has these columns:
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
subscription_json jsonb NOT NULL
user_agent text
endpoint text NOT NULL
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```
If the `endpoint` column is missing a UNIQUE constraint per user, add:
```sql
ALTER TABLE public.device_subscriptions 
  ADD CONSTRAINT device_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);
```

### 2.2 Announcements table (already exists — verify schema)

```sql
-- Verify these columns exist:
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
sent_by uuid NOT NULL REFERENCES public.users(id)
title text NOT NULL
body text NOT NULL
target_imams boolean NOT NULL DEFAULT false
target_admins boolean NOT NULL DEFAULT false
target_users boolean NOT NULL DEFAULT false
city_id integer REFERENCES public.cities(id)  -- NULL = global
push_count integer DEFAULT 0
created_at timestamptz DEFAULT now()
```

### 2.3 Add `country_id` to cities table (for drill-down in admin panels)

```sql
-- cities already has country_id via foreign key — verify:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cities' AND column_name = 'country_id';
```

### 2.4 Performance indexes (add if missing)

```sql
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_user_id ON public.device_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_city_id ON public.users(city_id);
CREATE INDEX IF NOT EXISTS idx_users_mosque_id ON public.users(mosque_id);
```

---

## 3. Sprint 1 — Bug Fixes (Do This First, Verify Before Moving On)

Fix ALL bugs listed in section 1.2 in this order:

1. `client/vite.config.js` — HMR fix (BUG-1)
2. `server/routes/admin.js` — `dbRole` fix (BUG-4), role string fix (BUG-5, BUG-6)
3. `server/routes/mosques.js` — role string fix (BUG-2), prayer time filter (BUG-7)
4. `server/routes/auth.js` — remove phone from login (BUG-3)
5. `client/src/pages/public/SignIn.jsx` — remove phone field (BUG-8)
6. `client/src/context/AuthContext.jsx` — cold-start logout fix (BUG-9)

**Verification checklist after Sprint 1:**
- [ ] No `city_admin` string anywhere in codebase (search for it)
- [ ] Login works with email + password only
- [ ] Refreshing the page does not log user out (even if server is slow)
- [ ] Dev server has no WebSocket errors in console
- [ ] Mosques with missing prayer times do not appear on home page (test by setting one field to null in DB)

---

## 4. Sprint 2 — Device Subscriptions + Announcement System

### 4.1 New API endpoint: `POST /api/push/device-subscribe`

Save the user's browser push subscription to `device_subscriptions` (not mosque-specific). This is called when the user opens the app and grants push permission — separate from mosque subscription.

```
POST /api/push/device-subscribe
Auth: required (any role)
Body: { subscription: PushSubscription, user_agent: string }
Logic:
  - Upsert into device_subscriptions on (user_id, endpoint)
  - Return { success: true }
```

### 4.2 New API endpoint: `DELETE /api/push/device-unsubscribe`

```
DELETE /api/push/device-unsubscribe
Auth: required
Body: { endpoint: string }
Logic:
  - Delete from device_subscriptions where user_id = req.user.sub AND endpoint = body.endpoint
```

### 4.3 Update `POST /api/push/announce` (super admin only)

Replace the current implementation with:

```
POST /api/push/announce
Auth: super_admin only
Body: {
  title: string (required),
  body: string (required),
  target_imams: boolean,
  target_admins: boolean,
  target_users: boolean,
  city_id: integer | null  (null = global)
}

Logic:
1. Validate: at least one of target_imams/target_admins/target_users must be true
2. Build target roles array from the three booleans
3. Query users table:
   SELECT u.id, ds.subscription_json
   FROM users u
   JOIN device_subscriptions ds ON ds.user_id = u.id
   WHERE u.role = ANY(targetRoles)
   -- if city_id provided:
   --   for imams: their mosque must be in that city
   --     (JOIN mosques m ON m.id = u.mosque_id WHERE m.city_id = cityId OR m.areas.city_id = cityId)
   --   for admins: u.city_id = cityId
   --   for users with city_id scoping: 
   --     users who have subscribed to at least one mosque in that city
   --     (JOIN push_subscriptions ps ON ps.user_id = u.id JOIN mosques m2 ON m2.id = ps.mosque_id WHERE m2.city_id = cityId)
   -- if no city_id: no location filter on users role
4. For each matching user's subscription_json, queue push notification
5. Save to announcements table:
   INSERT INTO announcements (sent_by, title, body, target_imams, target_admins, target_users, city_id, push_count)
   VALUES (req.user.sub, title, body, ..., count_of_queued_pushes)
6. Return { queued: N, announcement_id: uuid }
```

**Important**: City-scoped announcements to `users` role: query `push_subscriptions` joined to `mosques` where `mosques.city_id = cityId` OR `mosques.areas.city_id = cityId` (use either column — both exist). This gives you users who subscribed to at least one mosque in that city.

### 4.4 New API endpoint: `GET /api/push/announcements`

```
GET /api/push/announcements?limit=20&offset=0
Auth: super_admin only (for now)
Returns: announcements ordered by created_at DESC with sent_by user's display_name joined
```

### 4.5 Update push worker to handle device_subscriptions for announcements

In `server/workers/pushWorker.js`, the `announcement` type job payload now contains `subscription_json` directly (pre-fetched in the announce route). Update the worker to use `job.data.subscription_json` directly for announcement type instead of fetching from `push_subscriptions`. For `times_updated` and `eid_posted` types, keep fetching from `push_subscriptions` as before.

### 4.6 Frontend: Register device subscription on app start

In `client/src/main.jsx`, after registering the service worker, add device subscription registration:

```js
// After SW registration succeeds:
navigator.serviceWorker.ready.then(async reg => {
  const token = localStorage.getItem('waqt_token')
  if (!token) return  // not logged in, skip
  
  const existing = await reg.pushManager.getSubscription()
  if (!existing) return  // user hasn't granted permission yet
  
  // Save device subscription (fire and forget)
  fetch(`${import.meta.env.VITE_API_URL}/api/push/device-subscribe`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subscription: existing.toJSON(),
      user_agent: navigator.userAgent
    })
  }).catch(() => {})  // silent failure OK
})
```

---

## 5. Sprint 3 — Global Stats Endpoint + Activity Endpoint Expansion

### 5.1 New endpoint: `GET /api/admin/global-stats`

Super admin only. Returns a single object with all counts. **Minimize DB calls — use Promise.all for parallel queries, never sequential awaits for independent queries.**

```
GET /api/admin/global-stats
Auth: super_admin only

Response:
{
  countries: number,
  cities: number,
  neighborhoods: number,  // areas table
  mosques_total: number,
  mosques_active: number,
  admins: number,
  imams: number,
  users: number,
  subscribers: number,     // distinct user_ids in push_subscriptions
  announcements_sent: number
}

Implementation:
- Run ALL queries in parallel with Promise.all:
  const [countries, cities, areas, mosques, mosques_active, users_by_role, subscribers, announcements] = 
    await Promise.all([
      supabaseAdmin.from('countries').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('cities').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('areas').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('users').select('role'),
      supabaseAdmin.from('push_subscriptions').select('user_id', { count: 'exact', head: true }),
      supabaseAdmin.from('announcements').select('id', { count: 'exact', head: true }),
    ])
- Derive admins/imams/users from the users_by_role data (count in JS — one query, one DB call)
```

### 5.2 Update `GET /api/admin/my-stats` for city admin

City admin stats should return:
```
{
  mosque_count: number,      // active mosques in their city
  imam_count: number,        // imams assigned to mosques in their city
  area_count: number,        // neighborhoods in their city
  subscribers: number        // distinct users subscribed to any mosque in their city
}
```

Parallel queries:
```js
const cityId = req.role.city_id
const [mosques, imams, areas, subs] = await Promise.all([
  supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true })
    .eq('is_active', true).eq('city_id', cityId),
  supabaseAdmin.from('users').select('id', { count: 'exact', head: true })
    .eq('role', 'imam').eq('city_id', cityId),
  supabaseAdmin.from('areas').select('id', { count: 'exact', head: true })
    .eq('city_id', cityId),
  supabaseAdmin.from('push_subscriptions').select('user_id')
    .in('mosque_id', mosqueIds)  // get mosque IDs from first query first
])
```

Note: For subscribers, you need mosque IDs first. That's acceptable — fetch mosques, extract IDs, then fetch subscribers. Two sequential awaits only when there's a dependency.

### 5.3 Activity endpoint — expand to include useful data

`GET /api/admin/activity` currently returns prayer time change counts per day for 7 days. Expand to return:

```json
{
  "prayer_updates": [{ "date": "2026-04-13", "count": 3 }, ...],  // 7 days
  "recent_mosques": [                                               // last 3 registered
    { "id": "...", "name": "...", "created_at": "..." }
  ],
  "recent_imams": [                                                 // last 3 created
    { "id": "...", "display_name": "...", "mosque_name": "...", "created_at": "..." }
  ]
}
```

All three sub-queries run in parallel with `Promise.all`.

---

## 6. Sprint 4 — UI/UX Overhaul (Design Language Unification)

### 6.1 Design Principle

**Every panel (Imam, Admin, Super Admin) must use the same design language as `SuperPanel.css`.**

The SuperPanel has:
- iOS-glass aesthetic (`backdrop-filter: blur(20px)`, `border: 1px solid var(--border-subtle)`)
- Rounded pill tabs with accent background for active
- `super__list` rows with info + actions pattern
- iOS-style modal with `animation: modal-up`
- `super__widget` stat cards

Apply this same language to `AdminPanel` and `ImamPanel`. Do not invent new styles — reuse SuperPanel's CSS classes where applicable, or move shared styles to a new `client/src/styles/panels.css` and import it in both.

### 6.2 ImamPanel redesign

Current problems: plain card layout, no visual hierarchy, doesn't match SuperPanel style.

Redesign requirements:
- Same tabs style as SuperPanel (fixed sub-nav below TopBar)
- Tab 1: "Times" — the prayer time update form
- Tab 2: "Eid" — EidForm
- Tab 3: "History" — AuditLog

The prayer time update form should show:
- Each prayer as a row: prayer name (translated) on left, time input on right
- Maghrib row: show "Auto (sunset)" label instead of input, show computed time
- Dirty indicator: "Save" button has a green dot badge when there are unsaved changes
- Success state: brief green flash on the card after save (CSS transition, not toast-only)

**i18n**: All labels in the ImamPanel MUST use `t()`. No hardcoded English strings. Add any missing keys to all three locale files (`en.js`, `ur.js`, `ar.js`).

Missing i18n keys to add to all locales:
```js
// en.js additions:
imam: {
  ...existing...,
  tabs: { times: 'Prayer Times', eid: 'Eid Prayer', history: 'History' },
  maghribAuto: 'Auto — sunset',
  unsavedChanges: 'Unsaved changes',
  noChanges: 'No changes',
}
```
Add equivalent Urdu and Arabic translations.

### 6.3 AdminPanel redesign

Current problems: doesn't match SuperPanel style, missing i18n, tabs are plain links.

Redesign: make AdminPanel a thin wrapper that shares SuperPanel's route structure. Admin role sees a filtered version of SuperPanel:

- Tab: Overview (city-scoped stats — mosques, imams, areas, subscribers)
- Tab: Imams (the ImamManager component filtered to their city)
- Tab: Masjids (MosqueManager filtered to their city)
- Tab: Systems (RegionManager — city and area management only, no country tier)
- Tab: Audit (GlobalAudit filtered to their city)
- Tab: Account (AccountSettings)

**The AdminPanel.jsx should simply redirect to SuperPanel.jsx** — SuperPanel already handles both roles via the `isSuper` / `isCityAdmin` conditionals. The separate `AdminPanel.jsx` is redundant.

Action: In `client/src/App.jsx`, change the admin route to render `<SuperPanel />` instead of `<AdminPanel />`. The existing SuperPanel already checks `role?.role` and shows appropriate tabs.

Keep `AdminPanel.jsx` and `AdminPanel.css` files but gut their contents to just export a redirect component:
```jsx
import { Navigate } from 'react-router-dom'
export default function AdminPanel() { return <Navigate to="/admin" replace /> }
```

Wait — the admin route IS `/admin/*`. SuperPanel renders at `/super/*`. Solution: 

In `client/src/App.jsx`:
- The `/admin/*` route renders `<SuperPanel />` directly (no redirect needed, Routes still work because SuperPanel uses relative `Routes`)
- The `/super/*` route renders `<SuperPanel />` as before

SuperPanel's tab links must be relative (already using `basePath` variable). Verify `basePath` is correctly set to either `/super` or `/admin` based on role — it already does this.

**i18n**: All SuperPanel hardcoded strings must be internationalized. This is a large change. Add these keys to all locale files:

```js
// en.js — add under admin: {}
admin: {
  globalControl: 'Global Control',
  cityDashboard: 'City Dashboard',
  tabs: {
    overview: 'Overview',
    admins: 'Admins',
    imams: 'Imams',
    users: 'Users',
    masjids: 'Masjids',
    systems: 'Systems',
    audit: 'Audit',
    account: 'Account',
    broadcast: 'Broadcast',
  },
  stats: {
    liveMasjids: 'Live Masjids',
    activeImams: 'Active Imams',
    health: 'Health',
    uptime: 'Uptime',
    totalCountries: 'Countries',
    totalCities: 'Cities',
    totalAreas: 'Areas',
    totalUsers: 'Users',
    totalAdmins: 'Admins',
    subscribers: 'Subscribers',
    announcementsSent: 'Broadcasts Sent',
  },
  widgets: {
    operationalClearance: 'Operational Clearance',
    clearanceBody: 'Credentials verified. All actions logged to tamper-proof ledger.',
    systemActivity: 'System Activity',
  },
  users: {
    filterPlaceholder: 'Filter...',
    noResults: 'No results found.',
    initializeProfile: 'Initialize Profile',
    confirmUpdates: 'Confirm Updates',
    revokeAccess: 'Revoke Access?',
    revokeMessage: 'Are you sure you want to erase this account?',
  },
  regions: {
    countries: 'Countries',
    cities: 'Cities',
    areas: 'Areas',
    selectCountry: 'Select a country',
    selectCity: 'Select a city',
    noAreas: 'No areas found',
    registerCountry: 'Register Country',
    registerCity: 'Register City',
    registerArea: 'Register Neighborhood',
    timezone: 'Timezone',
    countryCode: 'Country Code',
    initializeRegion: 'Initialize Region',
  },
  audit: {
    ledger: 'Regional Ledger',
    entries: '{{count}} Entries',
    noActivity: 'No recorded activity.',
  },
  broadcast: {
    title: 'Message Title',
    titlePlaceholder: 'Announcement Title',
    body: 'Body Content',
    bodyPlaceholder: 'Write your announcement...',
    target: 'Broadcast Target',
    globalTarget: 'All Regions (Global)',
    transmit: 'Transmit Announcement',
    targetImams: 'Imams',
    targetAdmins: 'Admins',
    targetUsers: 'Users',
    sent: 'Sent to {{count}} recipients',
  },
  account: {
    personalSettings: 'Personal Settings',
    displayName: 'Display Name',
    phone: 'Phone Number',
    updatePassword: 'Update Password',
    passwordPlaceholder: 'Leave blank to keep current',
    saveChanges: 'Save Account Changes',
    accountId: 'Account ID',
    email: 'Email',
    level: 'Level',
  },
  mosques: {
    filterPlaceholder: 'Filter masjids...',
    deactivate: 'Deactivate Masjid?',
    deactivateMessage: 'Are you sure you want to turn off {{name}}?',
    deactivateConfirm: 'Deactivate',
    live: 'Live',
    off: 'Off',
    assignedArea: 'Assigned Area',
    registerMasjid: 'Register Masjid',
  },
}
```

Add equivalent Urdu and Arabic translations for every key. Urdu and Arabic are RTL — ensure all labels make sense grammatically.

### 6.4 SuperPanel widget improvements

The Overview tab currently shows static values for "Health" (100%) and "Uptime" (99.9%). Keep them as static display values — they're aspirational branding, not real metrics.

Replace the current 4-widget grid with a dynamic grid that fetches from `GET /api/admin/global-stats` for super admin, or `GET /api/admin/my-stats` for city admin.

**Super admin Overview widgets** (fetch from `/api/admin/global-stats`):
Row 1: Countries | Cities | Areas | Masjids Active
Row 2: Admins | Imams | Users | Subscribers

**City admin Overview widgets** (fetch from `/api/admin/my-stats`):
Row 1: Masjids | Imams | Areas | Subscribers

All widget labels use `t('admin.stats.*')` keys.

Below the widgets: the ActivityChart (already exists — keep it).

Below ActivityChart: a "Recent Activity" section showing:
- Last 3 registered mosques (from `recent_mosques` in activity response)
- Last 3 created imams (from `recent_imams` in activity response)

Display as two horizontal `super__list` rows under separate section headers. Use `t()` for headers.

### 6.5 Broadcast tab redesign

Replace the current broadcast form with a proper UI:

```
Title: [text input]
Body:  [textarea]
─────────────────────
Recipients:
  ☐ Imams    ☐ Admins    ☐ Users   (checkboxes, min 1 required)
─────────────────────
Scope:
  ○ Global   ○ Specific City → [city dropdown if selected]
─────────────────────
[Transmit Announcement button]
─────────────────────
Recent Announcements: (last 5, from GET /api/push/announcements)
  Each row: title | recipients | date | count pushed
```

All labels use `t('admin.broadcast.*')`.

### 6.6 Mosque register form — i18n

`MosqueRegisterForm.jsx` has hardcoded English strings. Replace all with `t()` calls. Add the following i18n keys:

```js
// en.js
mosque_register: {
  title: 'Register Mosque',
  hierarchy: 'Assign territorial hierarchy',
  pinLocation: 'Precisely pin the location',
  masjidName: 'Masjid Name',
  masjidNamePlaceholder: 'e.g. Masjid Al-Noor',
  country: 'Country',
  city: 'City',
  yourCity: 'Your Assigned City',
  area: 'Neighborhood / Area',
  selectCountry: 'Select country...',
  selectCity: 'Select city...',
  selectArea: 'Select area...',
  noAreas: 'No areas in this city. Add one in Systems tab.',
  continueToMap: 'Continue to Map',
  geoTargeting: 'GEO-TARGETING',
  waiting: 'WAITING FOR PIN...',
  confirmRegistration: 'Confirm Registration',
  tapMapToPin: 'Tap the map to set a location',
  success: 'Masjid successfully established',
}
```

---

## 7. Sprint 5 — Missing Backend Routes

### 7.1 Complete the admin user creation route

The existing `POST /api/admin/users` route in `admin.js` is broken (see BUG-4). After fixing `dbRole`, also fix the role assignment logic:

```js
// After fixing dbRole:
const allowedRoles = isSuper 
  ? ['admin', 'imam', 'user', 'super_admin'] 
  : ['imam']

if (!allowedRoles.includes(dbRole)) {
  return res.status(403).json({ error: 'You cannot create this role' })
}
```

### 7.2 Ensure `GET /api/mosques/geo/city/:id` exists

This endpoint is called in `MosqueRegisterForm.jsx` via `mosquesApi.getCityDetail(id)` to resolve an admin's city metadata. Verify it exists in `server/routes/mosques.js` — it should, based on the codebase. If missing, add:

```js
router.get('/geo/city/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('cities')
    .select('*, countries(*)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'City not found' })
  res.json(data)
})
```

### 7.3 Add `GET /api/admin/announcements`

```js
router.get('/announcements', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { limit = 20, offset = 0 } = req.query
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, users:sent_by(display_name)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})
```

---

## 8. Sprint 6 — Performance & Clean-up

### 8.1 Remove dead code

- `client/src/pages/admin/AdminPanel.jsx` — gut to redirect (per section 6.3)
- `client/src/pages/admin/AdminPanel.css` — keep (some styles may be referenced)
- Remove `client/src/App.css` content that references the Vite template counter/hero styles — they're not used
- Remove `client/src/index.css` — it contains the original Vite template styles which conflict with the app's theme system. Import `./styles/global.css` in `main.jsx` instead (it already imports the correct styles)

### 8.2 Session cache — confirmed removed

The caching layer was deliberately removed. Do NOT re-add any `sessionStorage` caching. Every fetch goes to the server. This is intentional — correctness over performance for this scale.

### 8.3 Supabase query optimization

For `GET /api/mosques`, the current query does:
```js
.select(`id, name, name_roman, lat, lng,
  areas(id, name, city_id, cities(id, name, timezone)),
  prayer_times(fajr, zuhr, asr, isha, jumma, maghrib_auto, updated_at)`)
```

This is fine. Prayer times is a one-to-one relation (UNIQUE constraint on mosque_id). Supabase returns it as an array — in the route, after fetching, normalize it:

```js
// After filtering for active and prayer-time-complete mosques:
const normalized = data.map(m => ({
  ...m,
  prayer_times: Array.isArray(m.prayer_times) ? m.prayer_times[0] : m.prayer_times
}))
```

### 8.4 Error handling consistency

Every route must return JSON errors, never HTML. The global error handler in `server/index.js` already does this. But some routes have bare `res.status(500).json({ error: error.message })` without logging. Add a console.error before every 500 response:

```js
console.error(`[${req.method} ${req.path}]`, error)
res.status(500).json({ error: error.message })
```

---

## 9. Critical Architecture Rules — Never Violate These

### Auth
- JWT is stored in `localStorage` under key `waqt_token`
- User object is stored in `localStorage` under key `waqt_user`
- Token expires in 30 days — no refresh token flow
- Password hashes NEVER leave the server (excluded from all SELECT responses)
- Super admin can access any route that admin, imam, or user can access — the `Protected` component handles this via `isSuperAdmin` bypass

### Role Scope Enforcement (Server Side)
- `imam`: can only modify `mosque_id === req.role.mosque_id`
- `admin`: can only modify mosques/users where `city_id === req.role.city_id`
- `super_admin`: no scope restriction
- These checks happen IN THE ROUTE HANDLER, not just in middleware

### Database Rules
- `prayer_times` table: ONE ROW per mosque, updated in-place. NOT per-date. History is in `audit_log`
- `audit_log` is append-only — never update or delete rows
- Mosque visibility: hidden from public if any of `[fajr, zuhr, asr, isha, jumma]` is null
- Jumma is required — a mosque without a Jumma time is hidden
- Maghrib is always computed client-side via SunCalc — never stored, never required for visibility

### Push Notifications
- Mosque subscriptions (`push_subscriptions`): mosque-specific, used for prayer time updates and Eid
- Device subscriptions (`device_subscriptions`): user-specific (no mosque), used for announcements
- Dead subscriptions (HTTP 410/404) are cleaned up by the push worker automatically
- BullMQ worker runs alongside the HTTP server — it's imported in `server/index.js`

### i18n
- ALL user-facing strings in ALL components use `t()` from `useLang()`
- NO hardcoded English strings in JSX (except console.log/error which are dev-only)
- Prayer names: `t('prayers.fajr')`, etc.
- Three locales: `client/src/i18n/locales/en.js`, `ur.js`, `ar.js`
- When adding a new key, add it to ALL THREE files simultaneously
- RTL: handled by `[dir="rtl"]` CSS rule — no manual RTL logic in components

### CSS / Theming
- All colors via CSS variables (`var(--accent)`, `var(--surface-1)`, etc.)
- Four themes defined in `client/src/styles/themes.css` — never hardcode hex colors in component CSS
- No Tailwind, no inline styles (except dynamic values like transforms)
- Font sizes: minimum 16px on inputs (prevents iOS auto-zoom)

---

## 10. File Change Summary (What to Touch)

### Server files to modify:
- `server/index.js` — no changes needed
- `server/routes/auth.js` — remove phone from login
- `server/routes/mosques.js` — fix role strings, add prayer time filter, normalize prayer_times array
- `server/routes/admin.js` — fix dbRole bug, fix role strings, add global-stats, expand my-stats, add announcements route, expand activity endpoint
- `server/routes/push.js` — add device-subscribe/unsubscribe, update announce route
- `server/routes/times.js` — fix role string (`'city_admin'` → `'admin'`)
- `server/workers/pushWorker.js` — update to handle announcement type with pre-fetched subscription
- `server/lib/push.js` — no changes needed

### Client files to modify:
- `client/vite.config.js` — HMR fix
- `client/src/main.jsx` — add device subscription registration
- `client/src/context/AuthContext.jsx` — cold-start logout fix
- `client/src/App.jsx` — point `/admin/*` route to `SuperPanel`
- `client/src/pages/public/SignIn.jsx` — remove phone field
- `client/src/pages/imam/ImamPanel.jsx` — add tabs, redesign to match SuperPanel style
- `client/src/pages/imam/ImamPanel.css` — update styles
- `client/src/pages/super/SuperPanel.jsx` — add i18n, expand stats, redesign broadcast tab, add recent activity
- `client/src/pages/super/SuperPanel.css` — minor additions
- `client/src/pages/admin/AdminPanel.jsx` — gut to redirect
- `client/src/pages/admin/MosqueRegisterForm.jsx` — add i18n
- `client/src/i18n/locales/en.js` — add all new keys
- `client/src/i18n/locales/ur.js` — add all new keys (translated)
- `client/src/i18n/locales/ar.js` — add all new keys (translated)

### Client files to delete content from:
- `client/src/App.css` — remove Vite template styles, keep only app-specific styles (check if anything references it first)
- `client/src/index.css` — safe to delete if `main.jsx` imports `./styles/global.css` instead

---

## 11. Implementation Order for the Agent

Follow this order exactly. Each step should be verifiable before the next:

```
Step 1:  Fix BUG-1  (vite.config.js HMR)
Step 2:  Fix BUG-9  (AuthContext cold-start)
Step 3:  Fix BUG-8  (SignIn.jsx remove phone)
Step 4:  Fix BUG-3  (auth.js remove phone from login)
Step 5:  Fix BUG-2  (all role string 'city_admin' → 'admin')
Step 6:  Fix BUG-4  (admin.js dbRole undefined)
Step 7:  Fix BUG-5+6 (my-stats and areas role strings)
Step 8:  Fix BUG-7  (mosque visibility filter)
Step 9:  Normalize prayer_times array in mosques route
Step 10: Add device-subscribe/unsubscribe endpoints
Step 11: Update announce route + save to announcements table
Step 12: Update pushWorker for announcement type
Step 13: Add device subscription in main.jsx
Step 14: Add global-stats endpoint
Step 15: Expand my-stats endpoint
Step 16: Expand activity endpoint
Step 17: Add announcements GET endpoint
Step 18: Add i18n keys to all three locale files
Step 19: Redesign ImamPanel with tabs + SuperPanel style
Step 20: Internationalize SuperPanel
Step 21: Redesign SuperPanel Overview (dynamic stats, recent activity)
Step 22: Redesign Broadcast tab
Step 23: Internationalize MosqueRegisterForm
Step 24: Point /admin/* route to SuperPanel in App.jsx
Step 25: Gut AdminPanel.jsx
Step 26: Clean up dead CSS/styles
```

---

## 12. Supabase Query Patterns — Best Practices

Use these patterns consistently:

```js
// COUNT without fetching rows (cheap):
const { count, error } = await supabaseAdmin
  .from('table')
  .select('*', { count: 'exact', head: true })
  .eq('column', value)

// Parallel queries (never sequential for independent data):
const [result1, result2, result3] = await Promise.all([
  supabaseAdmin.from('a').select(...),
  supabaseAdmin.from('b').select(...),
  supabaseAdmin.from('c').select(...),
])

// Join (Supabase syntax):
.select('*, related_table(column1, column2)')

// Filter on joined table column (note: uses eq on the parent):
// For filtering mosques by city_id where city_id might be on areas:
.eq('city_id', cityId)  // direct column
// OR for filtering via join:
.eq('areas.city_id', cityId)  // PostgREST join filter

// Upsert with conflict resolution:
.upsert({ ...data }, { onConflict: 'column1,column2' })
```

---

## 13. Environment Variables Reference

### `server/.env`
```
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=<48-byte hex>
VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=mailto:your@email.com
REDIS_URL=rediss://default:password@hostname.upstash.io:6379
```

### `client/.env.local`
```
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=B...
```

---

## 14. Testing Checklist (End-to-End)

After all sprints are complete, verify:

```
Auth:
  [ ] Register new user → lands on /
  [ ] Login super admin → lands on /super
  [ ] Login city admin → lands on /admin (renders SuperPanel)
  [ ] Login imam → lands on /imam
  [ ] Ctrl+R while logged in → stays logged in
  [ ] Hard refresh while logged in → stays logged in
  [ ] Server cold start → does not log user out

Mosques:
  [ ] Mosque with all 5 prayers set → visible on home
  [ ] Mosque with any prayer null → NOT visible on home
  [ ] Mosque with Jumma null → NOT visible on home
  [ ] Mosque detail page shows all prayers + countdown

Imam Panel:
  [ ] Three tabs render correctly
  [ ] Updating times shows success
  [ ] Audit tab shows history
  [ ] All text in 3 languages

Admin Panel (city admin):
  [ ] /admin/* renders SuperPanel with city-scoped tabs
  [ ] Can create imam for mosque in their city
  [ ] Cannot see mosques outside their city
  [ ] Stats show city-scoped counts

Super Admin Panel:
  [ ] Global stats widget shows all counts
  [ ] Broadcast works: selects recipients by role, saves to announcements table
  [ ] Recent announcements list shows in broadcast tab
  [ ] Systems tab: can add country, city, area
  [ ] All text in 3 languages

Push:
  [ ] Mosque subscription: subscribe, imam updates times, user gets push
  [ ] Device subscription saved when user is logged in and has push permission
  [ ] Announcement broadcast sends to correct roles

i18n:
  [ ] Switch to Urdu → all panel text changes, layout flips RTL
  [ ] Switch to Arabic → all panel text changes, layout flips RTL
  [ ] No English strings visible in Urdu/Arabic mode (check panels carefully)
```

---

## 15. Notes for the Agent

1. **This is a real production app used by real users.** Do not break existing functionality to implement new features.

2. **pnpm only.** Never use npm or yarn. The lockfiles are pnpm.

3. **ES modules throughout.** Server uses `"type": "module"`. Use `import`/`export` everywhere. No `require()`.

4. **Do not add new dependencies** without explicitly checking if an existing dependency can solve the problem. The project is budget-zero.

5. **When in doubt about a DB column name, check the SQL schema provided** (section 2 and the original schema in the project context). Do not guess.

6. **The `supabaseAdmin` client bypasses RLS** — use it for all server-side operations. The `supabase` (non-admin) client is for client-side only.

7. **BullMQ and Redis are present and should work if `REDIS_URL` is set correctly.** The format must be `rediss://` (with double s) for Upstash TLS connections. If the developer reports connection errors, check this first.

8. **Prayer times are stored as TIME type in PostgreSQL** — they come back from Supabase as strings like `"05:30:00"`. The frontend `formatTime12()` utility handles this format.

9. **Maghrib is NEVER stored, NEVER filtered on for mosque visibility.** It is computed client-side by SunCalc using the mosque's lat/lng.

10. **The service worker (`client/public/sw.js`) only handles push notifications.** Do not add any caching logic to it.
