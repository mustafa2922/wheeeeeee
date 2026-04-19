# Waqt-e-Namaz — Complete Project Context Document

> **Purpose:** This document gives any developer or AI agent full context of the Waqt-e-Namaz project — from original idea to current implementation state to future roadmap. Read this before touching any code.

---

## Table of Contents

1. [Project Origin & Problem Statement](#1-project-origin--problem-statement)
2. [Core Concept](#2-core-concept)
3. [Stakeholders & Roles](#3-stakeholders--roles)
4. [Locked Feature Set](#4-locked-feature-set)
5. [Architecture Overview](#5-architecture-overview)
6. [Database Schema](#6-database-schema)
7. [Backend — Server Implementation](#7-backend--server-implementation)
8. [Frontend — Client Implementation](#8-frontend--client-implementation)
9. [Auth System](#9-auth-system)
10. [Push Notification System](#10-push-notification-system)
11. [Business Logic Rules](#11-business-logic-rules)
12. [Design System](#12-design-system)
13. [i18n — Three Language System](#13-i18n--three-language-system)
14. [What Is Implemented (Current State)](#14-what-is-implemented-current-state)
15. [Known Issues & Fixes Applied](#15-known-issues--fixes-applied)
16. [Edge Cases & Guards](#16-edge-cases--guards)
17. [Next Phases](#17-next-phases)
18. [Free Deployment — Step by Step](#18-free-deployment--step-by-step)
19. [Environment Variables Reference](#19-environment-variables-reference)
20. [File Structure Reference](#20-file-structure-reference)

---

## 1. Project Origin & Problem Statement

**Who:** A 19-year-old MERN developer in Karachi, Pakistan building this completely free — no budget for paid services.

**Inspiration:** There is a WhatsApp group in Karachi run by one person ("X") who manually shares daily prayer timetables for different mosques as images or PDFs. X maintains contacts with imams and muazzins across dozens of mosques who inform him via WhatsApp when prayer times change (which happens every 2–3 weeks due to seasonal sun movement changes). The group exists so people don't miss Jamaat (congregation prayer).

**Problem with current system:**
- Manual — X has to update and reshare a spreadsheet every time any mosque changes a time
- No push notifications — users must actively check the group
- No searchability — images are not searchable
- Not scalable — one person managing everything manually
- Not discoverable — only WhatsApp group members benefit

**Goal:** Replace the WhatsApp group with a proper web application that:
- Shows live prayer times for all mosques
- Notifies subscribed users when times change
- Allows imams to update their own mosque's times directly
- Scales from Karachi to other cities and eventually other countries

---

## 2. Core Concept

The trust chain mirrors the real world:

```
Super Admin (you/X)
  └── Creates City Admins
        └── City Admin registers mosques + creates Imam accounts
              └── Imam logs in, updates prayer times for their mosque
                    └── Push notification fires to all subscribers of that mosque
                          └── Public users see updated times on home page
```

**Key insight:** Imams are the source of truth. They already manage the physical digital clock in their mosque. This system gives them a simple web form to do the same for the app — no technical knowledge required.

---

## 3. Stakeholders & Roles

### Super Admin
- You (the builder/owner)
- Created directly via SQL — never via UI registration
- Can do everything in the system
- Can create city admins, assign them to cities
- Can create imams directly
- Can update any user's credentials
- Can view the global audit log (every change ever made)
- Can broadcast announcements to all mosques or city-scoped
- Has no scope restriction — sees all cities, all mosques
- Multiple super admins supported (just insert multiple rows with `role = 'super_admin'`)

### City Admin (role: `admin` in DB)
- Created by super admin
- Scoped to one city (`city_id` column)
- Can register mosques in their city only
- Can create imam accounts for mosques in their city only
- Can view audit log for their city only
- Can deactivate mosques in their city
- Can add new areas within their city

### Imam / Muazzin (role: `imam` in DB)
- Created by city admin or super admin
- Scoped to exactly one mosque (`mosque_id` column)
- Can update prayer times for their mosque only
- Can post Eid prayer announcements for their mosque
- Can view change history (audit log) for their mosque
- Can update mosque info (name, etc.)
- Sees subscriber count for their mosque

### Public User (role: `user` in DB)
- Self-registers via `/register` page
- Can browse all mosques
- Can subscribe to mosques (gets push notifications)
- Can unsubscribe from mosques
- Can view prayer times, Eid schedules
- Can use GPS to find nearby mosques
- No ability to modify any data

### Unauthenticated Visitor
- Can view all mosque timetables (fully public)
- Cannot subscribe to push notifications (requires account)
- Can register or sign in

---

## 4. Locked Feature Set

### Prayer Types (per mosque)
| Prayer | Notes |
|--------|-------|
| Fajr | Changes every 2–3 weeks |
| Zuhr | Rarely changes — no default, imam must enter |
| Asr | Changes every 2–3 weeks |
| Maghrib | Always auto-computed from sunset using SunCalc + mosque lat/lng |
| Isha | Changes every 2–3 weeks |
| Jumu'ah (Jumma) | Weekly Friday prayer — shown daily (people plan ahead) |
| Eid ul-Fitr | Posted as a future-dated event by imam |
| Eid ul-Adha | Posted as a future-dated event by imam |

**Critical rule:** Maghrib is NEVER stored in the database. It is always computed client-side using the `suncalc` npm package with the mosque's `lat` and `lng` coordinates and today's date. This means Maghrib is always accurate even without internet (offline PWA) and requires zero server calls.

**Zuhr rule:** No default value. Must be explicitly entered by imam. Shows as "Pending" until set.

**Jumma rule:** Shown daily on all cards and detail pages — not just on Fridays. Users plan ahead.

### Push Notification Triggers
1. **Prayer time changed** — fires when imam saves any time update → sent to all subscribers of that mosque
2. **Eid prayer posted** — fires immediately when imam posts Eid → sent to all subscribers
3. **Admin broadcast** — super admin or city admin sends a manual announcement → city-scoped or global

### Public Features
- View today's full timetable for all mosques
- Next prayer highlighted with live countdown timer (updates every 30 seconds)
- Filter by area (dropdown) — no fuzzy search
- GPS-based nearby mosque discovery (sorted by Haversine distance)
- Subscribe/unsubscribe to mosques (bell icon)
- View mosque detail page
- View upcoming Eid prayers (shown 7 days before and 1 day after)
- Dark / Light / Warm / Midnight themes
- English / Urdu / Arabic language support with full RTL layout flip
- Install as PWA (Progressive Web App)
- Works offline (service worker caches last-seen data)
- Donate button (UI only in MVP — links to bank/Easypaisa details)

---

## 5. Architecture Overview

### Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + Vite | Component reuse, lazy loading, fast builds |
| Styling | Pure CSS with CSS variables | Zero runtime overhead, theme-aware |
| Backend | Node.js + Express | Thin server, owns auth + push logic |
| Database | Supabase PostgreSQL | Free tier, 500MB, excellent SDK |
| Auth | Custom JWT (bcryptjs + jsonwebtoken) | Replaced Supabase Auth — own users table |
| Cache | Upstash Redis | 10k commands/day free, sub-1ms reads |
| Push Queue | BullMQ + Upstash Redis | Async fan-out, retries, won't block requests |
| Push Delivery | web-push npm (VAPID) | Free, no third party, browser-native |
| Maps (registration) | Leaflet.js + OpenStreetMap | Completely free, no API key |
| Maps (user-facing) | Browser Geolocation API + JS | Zero cost |
| Sunset calculation | suncalc npm | Offline-capable, accurate |
| Frontend deploy | Vercel | Free, unlimited, instant |
| Backend deploy | Render.com | Free tier (sleeps after 15min idle) |
| DB host | Supabase | Free M0 tier |

### Why custom auth instead of Supabase Auth
The developer replaced Supabase Auth with a custom `users` table and JWT-based auth. This gives full control over the user schema, role structure, and credential management without dependency on Supabase Auth's new key system complexity. The tradeoff is you now own password hashing and token management — both handled by `bcryptjs` and `jsonwebtoken`.

### Request Flow
```
Browser → React (Vite, Vercel)
         → fetch() with Bearer JWT
           → Express (Render.com)
             → requireAuth middleware (verifies JWT)
               → requireRole middleware (checks role)
                 → Route handler
                   → supabaseAdmin (Postgres query)
                     → response
```

### Push Flow
```
Imam saves times
  → Express PATCH /api/times/:mosque_id
    → DB updated
    → Audit log written
    → queuePushNotification({ mosque_id, type, changes })
      → BullMQ adds job to Redis queue
        → pushWorker.js picks up job
          → Fetches all push_subscriptions for mosque_id
            → Calls webpush.sendNotification() for each subscriber
              → Browser wakes up
                → service worker shows notification
                  → User taps → opens /mosque/:id
```

---

## 6. Database Schema

**Database:** Supabase PostgreSQL (public schema)

### `countries`
```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
code        CHAR(2) NOT NULL UNIQUE
```
Seeded with: `Pakistan (PK)`

### `cities`
```sql
id          SERIAL PRIMARY KEY
country_id  INT → countries(id)
name        TEXT NOT NULL
timezone    TEXT NOT NULL  -- e.g. 'Asia/Karachi'
```
Seeded with: `Karachi, Asia/Karachi`

### `areas`
```sql
id          SERIAL PRIMARY KEY
city_id     INT → cities(id)
name        TEXT NOT NULL
```
Seeded with 15 Karachi areas including Gulshan-e-Iqbal, PECHS, Defence (DHA), Nazimabad, Clifton, Jail Road / Jamshaid Road, etc.

### `mosques`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
area_id     INT → areas(id)
name        TEXT NOT NULL          -- Urdu/Arabic name
name_roman  TEXT                   -- Roman/English transliteration
lat         NUMERIC(10,7)          -- for Maghrib + GPS distance
lng         NUMERIC(10,7)
is_active   BOOLEAN DEFAULT true
created_by  UUID → users(id)
created_at  TIMESTAMPTZ
```

### `prayer_times`
```sql
id           UUID PRIMARY KEY
mosque_id    UUID → mosques(id) UNIQUE  -- one row per mosque
fajr         TIME                        -- NULL = not set yet (shows "Pending")
zuhr         TIME                        -- NULL = not set yet
asr          TIME
isha         TIME
jumma        TIME
maghrib_auto BOOLEAN DEFAULT true        -- always true, Maghrib computed client-side
updated_by   UUID → users(id)
updated_at   TIMESTAMPTZ
```
**Note:** One row per mosque, updated in-place. Not append-only. History is in `audit_log`.

### `eid_prayers`
```sql
id           UUID PRIMARY KEY
mosque_id    UUID → mosques(id)
eid_type     TEXT CHECK IN ('fitr', 'adha')
prayer_date  DATE NOT NULL
prayer_time  TIME NOT NULL
year         INT NOT NULL
posted_by    UUID → users(id)
created_at   TIMESTAMPTZ
```
Multiple rows allowed per mosque per year (some mosques have two Eid jamaats at different times).

### `audit_log`
```sql
id          UUID PRIMARY KEY
mosque_id   UUID → mosques(id)
changed_by  UUID → users(id)
field       TEXT NOT NULL    -- e.g. 'fajr', 'zuhr'
old_value   TEXT             -- previous time as string
new_value   TEXT             -- new time as string
created_at  TIMESTAMPTZ
```
Append-only. Never deleted. Every prayer time change creates one row per changed field.

### `users` (custom — replaces Supabase Auth)
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
email        TEXT NOT NULL UNIQUE
password     TEXT NOT NULL        -- bcrypt hash, 12 rounds
display_name TEXT                 -- shown in audit log
phone        TEXT
role         TEXT CHECK IN ('super_admin', 'admin', 'imam', 'user')
mosque_id    UUID → mosques(id)   -- set for imams only
city_id      INT → cities(id)     -- set for city admins only
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```
**Scope rules:**
- `super_admin`: `mosque_id = NULL`, `city_id = NULL`
- `admin`: `mosque_id = NULL`, `city_id = <city>`
- `imam`: `mosque_id = <mosque>`, `city_id = NULL`
- `user`: both NULL

### `push_subscriptions`
```sql
id                UUID PRIMARY KEY
user_id           UUID → users(id) ON DELETE CASCADE
mosque_id         UUID → mosques(id) ON DELETE CASCADE
subscription_json JSONB NOT NULL   -- full PushSubscription object from browser
created_at        TIMESTAMPTZ
UNIQUE(user_id, mosque_id)
```

### Indexes (performance)
```sql
idx_mosques_area_id
idx_mosques_is_active
idx_prayer_times_mosque_id
idx_push_subscriptions_mosque_id
idx_audit_log_mosque_id
idx_audit_log_created_at DESC
idx_areas_city_id
```

---

## 7. Backend — Server Implementation

### Entry Point: `server/index.js`
- Express app with CORS allowing `CLIENT_URL` + localhost
- Imports and starts `pushWorker.js` alongside the HTTP server
- Routes mounted at `/api/auth`, `/api/mosques`, `/api/times`, `/api/push`, `/api/admin`
- Health check at `GET /health` → `{ status: 'ok' }`
- Uses ES modules (`"type": "module"` in package.json)

### `server/lib/supabase.js`
Two clients:
- `supabase` — uses publishable key, respects RLS
- `supabaseAdmin` — uses secret key, bypasses RLS, used for all server operations

### `server/lib/auth.js`
- `hashPassword(plain)` — bcrypt with 12 rounds
- `verifyPassword(plain, hash)` — bcrypt compare
- `signToken(user)` — JWT signed with `JWT_SECRET`, expires in 30 days, payload contains `sub, email, role, mosque_id, city_id`
- `verifyToken(token)` — JWT verify, throws on invalid/expired
- `getUserById(id)` — fetches user row from DB

### `server/middleware/requireAuth.js`
- Reads `Authorization: Bearer <token>` header
- Verifies JWT using `verifyToken()`
- Attaches `req.user` (JWT payload) and `req.role` (object with `role`, `mosque_id`, `city_id`)
- Returns 401 on missing/invalid token

### `server/middleware/requireRole.js`
- `requireRole(...allowedRoles)` — returns middleware
- Checks `req.role.role` is in `allowedRoles`
- Returns 403 if not

### Routes

#### `POST /api/auth/register`
Public. Creates a `user`-role account. Checks email uniqueness. Returns JWT + user object.

#### `POST /api/auth/login`
Public. Verifies email + bcrypt password. Returns JWT + user object (no password hash).

#### `GET /api/auth/me`
Protected. Returns full user row for the token holder.

#### `POST /api/auth/create-admin`
Super admin only. Creates an `admin`-role user with `city_id`.

#### `POST /api/auth/create-imam`
Admin or super admin. Creates an `imam`-role user with `mosque_id`. Admin scoped to their city — verifies mosque belongs to their city before creating.

#### `PATCH /api/auth/update-credentials`
Super admin only. Updates email and/or password for any user by `target_user_id`.

#### `GET /api/mosques`
Public. Returns all active mosques with prayer times and area/city info. Supports `?area_id=` and `?city_id=` query params. If `?lat=&lng=` provided, sorts by Haversine distance in JS.

#### `GET /api/mosques/:id`
Public. Single mosque with prayer times + eid prayers.

#### `POST /api/mosques`
Admin or super admin. Registers a mosque. Creates empty `prayer_times` row for it. Admin scoped to their city.

#### `PATCH /api/mosques/:id/deactivate`
Admin or super admin. Sets `is_active = false`.

#### `GET /api/mosques/geo/countries`
Public. All countries.

#### `GET /api/mosques/geo/cities/:country_id`
Public. Cities for a country.

#### `GET /api/mosques/geo/areas/:city_id`
Public. Areas for a city.

#### `PATCH /api/times/:mosque_id`
Imam (own mosque only), admin, or super admin. Updates prayer time fields. Writes audit log entries for each changed field. Queues push notification.

#### `POST /api/times/:mosque_id/eid`
Imam, admin, or super admin. Posts an Eid prayer entry. Queues push notification.

#### `GET /api/times/:mosque_id/maghrib`
Public. Computes sunset time using SunCalc for mosque coordinates. Rarely needed — client computes this itself.

#### `GET /api/times/:mosque_id/audit`
Imam (own mosque), admin, super admin. Returns change history.

#### `POST /api/push/subscribe`
Authenticated. Saves PushSubscription JSON to `push_subscriptions`.

#### `DELETE /api/push/unsubscribe`
Authenticated. Removes subscription row.

#### `GET /api/push/my-subscriptions`
Authenticated. Returns array of mosque IDs the user is subscribed to.

#### `POST /api/push/announce`
Admin or super admin. Queues push notification for all mosques in a city (or global if super admin). City admin scoped to their city.

#### `GET /api/admin/audit`
Super admin: all audit log entries. City admin: scoped to their city.

#### `GET /api/admin/users`
Super admin only. All users with roles and scope info.

#### `POST /api/admin/cities`
Super admin only. Adds a new city.

#### `POST /api/admin/areas`
Super admin or admin. Adds a new area to a city.

#### `GET /api/admin/my-stats`
Admin or super admin. Returns mosque count and imam count for their scope.

### `server/lib/push.js`
- Creates BullMQ `Queue` named `push-notifications` using Upstash Redis
- Exports `queuePushNotification(payload)` — adds job with 3 retry attempts, exponential backoff

### `server/workers/pushWorker.js`
- BullMQ `Worker` consuming `push-notifications` queue
- Sets VAPID details from env vars
- For each job: fetches mosque name, fetches all subscriptions for that mosque
- Builds notification payload based on `type` (`times_updated`, `eid_posted`, `announcement`)
- Calls `webpush.sendNotification()` for each subscriber
- Cleans up expired subscriptions (HTTP 410/404 from push service)
- Imported in `server/index.js` so it runs alongside the HTTP server

---

## 8. Frontend — Client Implementation

### Entry: `src/main.jsx`
Provider stack (outer to inner):
```
ThemeProvider
  LangProvider
    AuthProvider
      ToastProvider
        BrowserRouter
          App
```
Service worker registered here for PWA + push.

### `src/App.jsx`
- All pages lazy-loaded with `React.lazy()` for fast initial paint
- `PageFallback` component shows skeleton loaders during lazy load
- `Protected` component handles route guards:
  - Unauthenticated → redirect to `/sign-in`
  - Super admin bypasses all role checks (can access any protected route)
  - Wrong role → redirect to `/`
- Routes: `/`, `/nearby`, `/mosque/:id`, `/subscriptions`, `/settings`, `/sign-in`, `/register`, `/imam/*`, `/admin/*`, `/super/*`

### Context Providers

#### `ThemeContext`
- 4 themes: `light`, `dark`, `warm`, `midnight`
- Persisted to `localStorage`
- Applied as `data-theme` attribute on `<html>`
- Respects OS `prefers-color-scheme` on first visit

#### `LangContext`
- 3 languages: `en`, `ur`, `ar`
- Persisted to `localStorage`
- Applies `lang` and `dir` attributes to `<html>` (RTL flip for ur/ar)
- Exposes `t(key, vars)` translation function
- `t('prayers.fajr')` → `"Fajr"` / `"فجر"` / `"الفجر"`

#### `AuthContext`
- Reads user from `localStorage` on mount (instant — no loading state)
- `signIn(email, password)` → calls `/api/auth/login`, stores token + user, returns user
- `register(email, password, display_name)` → calls `/api/auth/register`
- `signOut()` → clears localStorage, sets user to null
- Exposes: `user`, `role`, `isSuperAdmin`, `isAdmin`, `isImam`, `loading`
- Token stored as `waqt_token`, user as `waqt_user`

### Hooks

#### `useMosques({ areaId, cityId })`
- Session-cache with 5-minute TTL (`sessionStorage` key: `mosques_cache`)
- On cache hit: instant render, no network call
- Enriches each mosque with computed Maghrib time client-side
- `invalidateCache()` called after imam updates times

#### `useMosque(id)`
- Checks session cache first — if mosque found, returns immediately
- Falls back to `GET /api/mosques/:id` only on direct URL navigation

#### `useNextPrayer(prayerTimes, lat, lng)`
- Computes which prayer comes next from current time
- Updates every 30 seconds (battery-friendly)
- Returns `{ name, time, msUntil }` and formatted `countdown` string

#### `useAreas(cityId)`
- In-memory cache (`_areaCache` object) — never re-fetched during session
- Returns area list for dropdown

#### `useSubscriptions()`
- Fetches user's subscriptions once on mount
- `toggle(mosqueId, subscription)` — optimistic update, reverts on failure
- Uses `Set` for O(1) lookup in UI

#### `usePushSubscription()`
- Requests push permission and returns `PushSubscription` object
- Converts VAPID public key to `Uint8Array`

### Pages

#### `Home.jsx` — `/`
- Area filter dropdown (no fuzzy search — deliberate)
- Mosque list filtered by selected area (pure derived state, no re-fetch)
- Shows skeleton loaders while fetching
- Empty state with hint text
- Each mosque card shows next prayer + countdown

#### `Nearby.jsx` — `/nearby`
- Auto-requests GPS on mount
- Sorts all cached mosques by Haversine distance
- Shows distance badge (meters or km) on each card
- Shows top 20 nearest

#### `MosqueDetail.jsx` — `/mosque/:id`
- Hero section with next prayer + large countdown
- Full prayer times list with current prayer highlighted
- Upcoming Eid section (filtered to future dates)
- Google Maps link using mosque coordinates
- Subscribe/unsubscribe in top bar
- Last updated timestamp

#### `Subscriptions.jsx` — `/subscriptions`
- Guest state with sign-in prompt
- Filters all cached mosques to only subscribed ones
- Empty state when no subscriptions

#### `Settings.jsx` — `/settings`
- Language switcher (3 options, checkmark on active)
- Theme switcher (4 swatches with labels)
- Account section: email, role badge, dashboard link, sign out
- Donate section (placeholder UI)
- Version footer

#### `SignIn.jsx` — `/sign-in`
- Redirects already-logged-in users to their dashboard on mount
- `dashboardFor(role)` maps role string to route
- On successful login: navigates using returned user object (no stale state)
- `setLoading(false)` in `finally` block — button never stuck

#### `Register.jsx` — `/register`
- Calls `/api/auth/register`
- On success: stores token + user, redirects to `/`

#### `ImamPanel.jsx` — `/imam`
- Shows mosque name from role's `mosque_id`
- Time input fields for Fajr, Zuhr, Asr, Isha, Jumma
- Maghrib note: "auto-computed"
- Save button disabled until dirty (something changed)
- Busts session cache on successful save
- Includes `EidForm` and `AuditLog` sub-components

#### `AdminPanel.jsx` — `/admin`
- Tab navigation: Overview, Mosques, Imams, Audit Log
- Overview: mosque + imam count stats
- Mosques tab: `MosqueRegisterForm` with Leaflet map
- Imams tab: create imam with mosque assignment dropdown
- Audit Log: all changes for their city

#### `SuperPanel.jsx` — `/super`
- Tab navigation: Overview, Admins, Mosques, Users, Audit Log, Broadcast
- Admins tab: create city admin, list all users/roles
- Mosques tab: register mosque (same form as admin)
- Users tab: all users with role badges
- Audit Log: global — all changes ever
- Broadcast: send push to city or global

### Components

#### `MosqueCard.jsx`
- Next prayer banner (accent background) with countdown badge
- 3×2 prayer time grid using CSS grid + separator trick
- Highlighted current-prayer cell
- Subscribe bell button (optimistic toggle)
- Eid badge in footer if upcoming Eid exists
- Navigates to detail page on press (ignores subscribe button tap)

#### `Button.jsx`
- Variants: `primary`, `secondary`, `ghost`, `danger`
- Sizes: `sm`, `md`, `lg`
- Loading spinner state, disabled state, icon-only mode, full-width

#### `Card.jsx`
- Sub-components: `Card.Header`, `Card.Body`, `Card.Footer`
- Pressable variant with tap feedback animation

#### `Skeleton.jsx`
- Shimmer animation using CSS background trick
- `Skeleton.MosqueCard` pre-built variant

#### `Badge.jsx`
- Variants: `accent`, `success`, `warning`, `danger`, `neutral`

#### `Toast.jsx`
- Provider + `useToast()` hook
- Max 4 toasts queued
- Auto-dismiss after 3500ms
- Types: `success`, `error`, `info`
- Positioned above bottom nav

#### `BottomNav.jsx`
- 4 tabs: Home, Nearby, My Mosques, Settings
- iOS-style with backdrop blur
- Active icon scales up (spring animation)
- RTL-aware (icon direction doesn't flip but layout does)

#### `TopBar.jsx`
- Fixed, backdrop blur
- Back button is RTL-aware (ChevronLeft/Right flips)
- Right slot for custom actions

#### `AppShell.jsx`
- Renders TopBar + `<Outlet />` + BottomNav
- Used as layout route in React Router

### `public/sw.js` — Service Worker
- Caches app shell routes on install
- Network-first for `/api` calls
- Cache-first for all other assets
- Push event: shows browser notification with title, body, mosque_id in data
- Notification click: focuses existing tab or opens `/mosque/:id`

---

## 9. Auth System

### Flow: Registration
```
POST /api/auth/register
  body: { email, password, display_name }
  → check duplicate email
  → bcrypt.hash(password, 12)
  → INSERT into users with role='user'
  → signToken(user) → JWT (30 day expiry)
  → return { token, user: { id, email, role } }
```

### Flow: Login
```
POST /api/auth/login
  body: { email, password }
  → SELECT user by email
  → bcrypt.compare(password, user.password)
  → signToken(user)
  → return { token, user } (password hash excluded)
```

### JWT Payload
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "imam",
  "mosque_id": "uuid or null",
  "city_id": 1,
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Creating Super Admin (manually, one time)
```bash
# In server/ folder — generate bcrypt hash
node -e "import('bcryptjs').then(({default:b})=>b.hash('YourPassword',12).then(h=>console.log(h)))"

# Then run in Supabase SQL Editor:
INSERT INTO public.users (email, password, display_name, role)
VALUES ('your@email.com', '<hash>', 'Your Name', 'super_admin')
ON CONFLICT (email)
  DO UPDATE SET role='super_admin', password=EXCLUDED.password;
```

### Token Storage
- Key: `waqt_token` in `localStorage`
- User object: `waqt_user` in `localStorage`
- Auto-cleared on 401 response (triggers redirect to `/sign-in`)

### Route Protection Hierarchy
```
super_admin → can access /super, /admin, /imam, /
admin       → can access /admin, /
imam        → can access /imam, /
user        → can access /
```
`Protected` component: super admin bypasses all role checks.

---

## 10. Push Notification System

### Setup
1. Generate VAPID keys once: `node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"`
2. Store in `server/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`
3. Pass `VAPID_PUBLIC_KEY` to frontend via `VITE_VAPID_PUBLIC_KEY`

### Subscription Flow (client)
```
User clicks bell icon
  → usePushSubscription.requestSubscription()
    → navigator.serviceWorker.ready
      → reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_KEY })
        → returns PushSubscription object
          → POST /api/push/subscribe { mosque_id, subscription }
            → saved to push_subscriptions table
```

### Delivery Flow (server)
```
Imam updates times
  → PATCH /api/times/:mosque_id
    → queuePushNotification({ mosque_id, type: 'times_updated', changes })
      → BullMQ job added to Redis
        → pushWorker picks up job
          → SELECT subscription_json FROM push_subscriptions WHERE mosque_id = ?
            → webpush.sendNotification(sub, JSON.stringify({ title, body, mosque_id, type }))
              → Browser push service delivers to user's device
                → sw.js push event fires
                  → showNotification(title, { body, icon, data: { mosque_id } })
```

### Dead Subscription Cleanup
When `webpush.sendNotification()` returns HTTP 410 (Gone) or 404, the subscription is expired. The worker deletes it from the database automatically, keeping the table clean.

### Notification Content
- **times_updated:** `title: "مسجد کا نام"`, `body: "اوقات تبدیل ہوئے: fajr, asr"`
- **eid_posted:** `title: "مسجد کا نام — عید نماز"`, `body: "عید الفطر: 2025-03-31 07:00"`
- **announcement:** Custom title and body from admin

---

## 11. Business Logic Rules

1. **Maghrib is never stored.** Always computed via `suncalc.getTimes(date, lat, lng).sunset`. If `maghrib_auto = false` is somehow set, fall back to stored value — but this case should not occur.

2. **Zuhr has no default.** An imam must explicitly enter it. Until then, it shows as "Pending" in the UI.

3. **Jumma shown daily.** Not gated behind Friday check. Displayed as its own row on all cards.

4. **One prayer_times row per mosque.** Created when mosque is registered. Updated in-place. History in audit_log.

5. **Eid allows multiple entries per mosque per year.** Some mosques hold two Eid jamaats. Both show.

6. **Eid display window.** Show on public page from 7 days before `prayer_date` to 1 day after.

7. **Imam scope is absolute.** An imam cannot update any mosque other than their assigned one. The check is in the route: `req.role.mosque_id !== mosque_id → 403`.

8. **City admin scope is absolute.** Area must belong to their `city_id`. Mosque must be in their city for imam assignment.

9. **Push fails silently.** Push errors are caught per-subscription. One failed delivery does not block others. Dead subscriptions auto-cleaned.

10. **Session cache invalidated on write.** When imam saves times, `sessionStorage.removeItem('mosques_cache')` is called. Next page view fetches fresh data.

11. **Audit log is append-only.** No updates, no deletes. Every changed field gets its own row.

12. **Password hash never leaves server.** The `password` column is excluded from all SELECT results sent to clients.

---

## 12. Design System

### Themes (4)
All themes defined as CSS custom properties on `[data-theme="name"]` selector:

| Theme | Accent | Background | Use case |
|-------|--------|-----------|----------|
| `light` | `#059669` (emerald) | `#ffffff` / `#f2f2f7` | Default |
| `dark` | `#34d399` | `#000000` / `#1c1c1e` | Night |
| `warm` | `#b45309` (amber) | `#fdf8f0` (sepia) | Gentle — Fajr/Isha |
| `midnight` | `#38bdf8` (sky blue) | `#03111e` (deep navy) | Premium night |

### CSS Variables
Complete set of tokens in `src/styles/tokens.css`:
- Spacing: `--space-1` through `--space-12` (4px base grid)
- Radius: `--radius-sm/md/lg/xl/full`
- Typography: `--text-xs` through `--text-3xl`
- Shadows: `--shadow-xs/sm/md/lg` (very subtle, iOS-style)
- Blur: `--blur-sm/md/lg` (for frosted glass nav/modals)
- Z-index: `--z-base/raised/nav/overlay/modal/toast`
- Transitions: `--transition-fast/base/spring`

### iOS Design Signatures
- `backdrop-filter: blur(20px) saturate(180%)` on TopBar and BottomNav
- `min-height: 100dvh` (dynamic viewport height — fixes iOS toolbar issue)
- `env(safe-area-inset-bottom)` for iPhone notch/home indicator
- `-webkit-tap-highlight-color: transparent` removes blue flash on tap
- `overscroll-behavior: none` prevents pull-to-refresh
- Spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for icon scale
- `16px` minimum font size on inputs (prevents iOS auto-zoom)

### Typography
Three font stacks, one per language:
- English: `Inter, -apple-system, SF Pro Display, Segoe UI, sans-serif`
- Urdu: `Noto Nastaliq Urdu` — **requires `line-height: 2.2`** or text clips
- Arabic: `Noto Naskh Arabic` — `line-height: 1.8`

Applied via `lang` attribute on `<html>`, which triggers CSS variable override.

### RTL Support
When `lang = 'ur'` or `lang = 'ar'`:
- `<html dir="rtl">` is set by `LangContext`
- CSS `direction: rtl` flips all flex/grid layouts
- `padding-inline-start/end` used instead of `padding-left/right` everywhere
- Back button uses `ChevronRight` instead of `ChevronLeft`
- Distance badge positioned with `inset-inline-end`

---

## 13. i18n — Three Language System

### Architecture
Custom implementation — no library. ~60 lines total.

Files:
- `src/i18n/locales/en.js` — English (LTR)
- `src/i18n/locales/ur.js` — Urdu (RTL, Nastaliq)
- `src/i18n/locales/ar.js` — Arabic (RTL, Naskh)
- `src/i18n/index.js` — `resolve()`, `interpolate()`, `createTranslator()`

### Usage
```jsx
const { t } = useLang()
t('prayers.fajr')                          // → "Fajr" / "فجر" / "الفجر"
t('mosque.subscribersCount', { count: 42 }) // → "42 subscribers"
```

### Adding a new language
1. Create `src/i18n/locales/xx.js` with same key structure
2. Add to `LOCALES` object in `src/i18n/index.js`
3. Add `meta: { lang, dir, label, fontClass }` in the new file
4. Import the font in `src/styles/typography.css`
5. Done — language appears in Settings automatically

### Interpolation
`{{variable}}` syntax: `t('mosque.updatedAt', { date: '2025-01-01' })` → `"Updated 2025-01-01"`

---

## 14. What Is Implemented (Current State)

### ✅ Done — Backend
- [x] Express server with CORS, JSON parsing
- [x] Supabase connection (publishable + secret keys)
- [x] Custom JWT auth (bcrypt + jsonwebtoken)
- [x] `requireAuth` middleware
- [x] `requireRole` middleware
- [x] All auth routes (register, login, me, create-admin, create-imam, update-credentials)
- [x] All mosque routes (CRUD + geo endpoints)
- [x] Prayer times routes (update, Eid post, Maghrib compute, audit log)
- [x] Push subscription routes (subscribe, unsubscribe, my-subscriptions, announce)
- [x] Admin routes (audit, users, cities, areas, stats)
- [x] BullMQ push queue
- [x] Push worker with VAPID, fan-out, dead subscription cleanup
- [x] SunCalc Maghrib computation
- [x] Haversine distance sort
- [x] Audit log write on every time change
- [x] Session cache bust on write

### ✅ Done — Database
- [x] All tables created
- [x] Foreign keys rewired from auth.users → public.users
- [x] Indexes created
- [x] Seed data (Pakistan, Karachi, 15 areas)
- [x] `display_name` column added to users

### ✅ Done — Frontend
- [x] React + Vite project
- [x] 4-theme CSS system (light, dark, warm, midnight)
- [x] 3-language i18n (en, ur, ar) with RTL flip
- [x] ThemeContext, LangContext, AuthContext
- [x] All UI components (Button, Card, Badge, Skeleton, Toast, BottomNav, TopBar, AppShell)
- [x] All hooks (useMosques, useMosque, useNextPrayer, useAreas, useSubscriptions, usePushSubscription)
- [x] Home page with area filter + skeleton loading
- [x] MosqueCard with next prayer highlight + countdown
- [x] Mosque detail page
- [x] Nearby page (GPS + distance sort)
- [x] Subscriptions page
- [x] Settings page (theme + language + account)
- [x] SignIn page (fixed redirect bug, fixed spinner stuck bug)
- [x] Register page
- [x] Imam panel (update times + EidForm + AuditLog)
- [x] Admin dashboard (tabs: overview, mosques, imams, audit)
- [x] MosqueRegisterForm with Leaflet map
- [x] Super Admin dashboard (tabs: overview, admins, mosques, users, audit, broadcast)
- [x] Service worker (offline cache + push handler)
- [x] PWA service worker registration
- [x] Protected route guards
- [x] Role-based redirect after login
- [x] `api.js` auto-logout on 401
- [x] Session cache (5min TTL, instant repeat visits)
- [x] Vite HMR config fix

### 🔧 Currently Being Fixed
- Auth flow end-to-end testing (sign-in → redirect → dashboard)
- Super admin first-time creation via SQL script

---

## 15. Known Issues & Fixes Applied

### Issue 1: WebSocket HMR failing
**Symptom:** `WebSocket connection to 'ws://localhost:5173/?token=...' failed`
**Fix:** Add to `client/vite.config.js`:
```js
server: { hmr: { protocol: 'ws', host: 'localhost' } }
```

### Issue 2: 404 on `/api/auth/sign-in`
**Symptom:** Old AuthContext version calling wrong endpoint
**Fix:** Ensure `AuthContext.signIn()` calls `/api/auth/login` not `/api/auth/sign-in`

### Issue 3: Spinner stuck after login
**Symptom:** `setLoading(false)` only called in catch, not in finally
**Fix:** Move `setLoading(false)` to `finally` block in `SignIn.handleSubmit`

### Issue 4: Wrong role string for admin
**Symptom:** `role?.role === 'city_admin'` check fails — DB stores `'admin'`
**Fix:** All role checks use `'admin'` not `'city_admin'`

### Issue 5: `SyntaxError: Unexpected token '<'`
**Symptom:** Server returns HTML error page, client tries to parse as JSON
**Root cause:** 404 route — server has no matching route, Express returns HTML
**Fix:** Fix the route mismatch (Issues 2 + 4 above)

### Issue 6: Foreign keys pointing to `auth.users`
**Symptom:** Insert errors on audit_log, prayer_times, etc.
**Fix:** SQL migration script dropping old FK constraints and re-adding pointing to `public.users`

### Issue 7: `push_subscriptions` missing unique constraint
**Fix:** `ALTER TABLE push_subscriptions ADD CONSTRAINT ... UNIQUE(user_id, mosque_id)`

---

## 16. Edge Cases & Guards

- **Imam tries to update another mosque's times:** Route checks `req.role.mosque_id !== mosque_id` → 403
- **City admin tries to register mosque in another city:** Route fetches area's city_id, compares with `req.role.city_id` → 403
- **Push subscription already exists:** `upsert` with `onConflict: 'user_id,mosque_id'` — idempotent
- **Expired push subscription:** Worker catches 410/404, deletes row
- **Mosque with no prayer times set:** Shows "Pending" label per field — never null pointer
- **Maghrib with no coordinates:** Falls back to stored value or "—"
- **User with no role:** `Protected` component sends to `/` (public home)
- **All prayers passed for today:** `useNextPrayer` wraps to Fajr tomorrow
- **Session cache corrupt:** `try/catch` around JSON.parse, falls through to fresh fetch
- **Area cache:** In-memory Map — never stale within session (areas never change during use)
- **Token expired mid-session:** `api.js` catches 401, clears storage, redirects to sign-in
- **Multiple Eid entries:** All shown, filtered to future dates, sorted by date
- **Duplicate email on register:** Server checks before insert → 409 Conflict
- **Render.com cold start:** Use cron-job.org to ping `/health` every 14 minutes

---

## 17. Next Phases

### Phase 2 — Polish & Stability
- [ ] Loading state on app mount (check localStorage token validity against `/api/auth/me`)
- [ ] Refresh token or session extension (currently 30-day JWT, just re-login)
- [ ] Forgot password flow (email reset — needs email provider, e.g. Resend free tier)
- [ ] Mosque profile page (editable by imam: description, address text, contact)
- [ ] Subscriber count visible to imam
- [ ] Imam can post a custom note / announcement for their mosque
- [ ] Admin can edit mosque name and coordinates after registration
- [ ] Image upload for mosque (logo/photo) — Supabase Storage free tier

### Phase 3 — Scale Beyond Karachi
- [ ] Multi-city support UI (city selector on home page)
- [ ] Country selector
- [ ] Timezone-aware display (cities outside Pakistan show times in local timezone)
- [ ] Add new city/country from super admin panel (API exists, UI needs build)
- [ ] Automatic Maghrib calculation using city's timezone + coordinates

### Phase 4 — Discovery & Growth
- [ ] Google Maps embed on mosque detail page (pin view)
- [ ] Share mosque page (Web Share API)
- [ ] "Recently updated" badge on cards updated in last 24h
- [ ] Search by mosque name (simple ILIKE, no fuzzy — substring match)
- [ ] SEO: server-side render mosque times for Google indexing
- [ ] WhatsApp deep link to share timetable image

### Phase 5 — Monetization (Optional / Sadaqah Model)
- [ ] Donate button → links to Easypaisa/JazzCash number or bank account
- [ ] "Sadaqah Jariyah" framing in settings page
- [ ] No ads ever (Anthropic-inspired: product should be a space to think/pray)

### Phase 6 — Native App Feel
- [ ] PWA install prompt (custom UI, not browser default)
- [ ] Background sync for offline time updates
- [ ] Notification preferences per prayer (e.g. only notify for Fajr changes)
- [ ] Widget-style home screen PWA (show next prayer on lock screen via Badging API)
- [ ] Haptic feedback on subscribe/unsubscribe (Vibration API)

### Phase 7 — Admin Dashboards (Full)
- [ ] Charts: subscriber growth over time per mosque
- [ ] Charts: how often each mosque updates times
- [ ] Super admin: merge duplicate mosques
- [ ] Super admin: transfer imam assignment
- [ ] City admin: bulk import mosques from CSV
- [ ] Audit log export to CSV

---

## 18. Free Deployment — Step by Step

### Prerequisites
All of these are free, no credit card required:
- GitHub account (code hosting)
- Vercel account (frontend)
- Render.com account (backend)
- Supabase account (database — already set up)
- Upstash account (Redis — already set up)
- cron-job.org account (keep-alive)

---

### Step 1 — Push to GitHub
```bash
# In project root
git add .
git commit -m "MVP complete"
git remote add origin https://github.com/yourusername/waqt-e-namaz.git
git push -u origin master
```

---

### Step 2 — Deploy Frontend to Vercel

1. Go to **vercel.com** → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `client`
4. Framework: **Vite** (auto-detected)
5. Add environment variables:
   ```
   VITE_API_URL=https://your-render-url.onrender.com
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
   ```
6. Click Deploy
7. Note your Vercel URL: `https://waqt-e-namaz.vercel.app`

---

### Step 3 — Deploy Backend to Render.com

1. Go to **render.com** → New → Web Service
2. Connect GitHub repo
3. Settings:
   - Root Directory: `server`
   - Build Command: `pnpm install`
   - Start Command: `node index.js`
   - Environment: Node
4. Add all environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   CLIENT_URL=https://waqt-e-namaz.vercel.app
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   JWT_SECRET=your_long_random_secret
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   VAPID_MAILTO=mailto:your@email.com
   REDIS_URL=rediss://your_upstash_url
   ```
5. Click Create Web Service
6. Note your Render URL: `https://waqt-e-namaz-api.onrender.com`
7. Go back to Vercel → update `VITE_API_URL` to this URL → Redeploy

---

### Step 4 — Keep Render Warm (Critical)

Render free tier sleeps after 15 minutes of inactivity. A user opening the app at Fajr time after a quiet night would see a 30-second blank screen.

1. Go to **cron-job.org** → Register free
2. New Cronjob:
   - URL: `https://waqt-e-namaz-api.onrender.com/health`
   - Schedule: Every 14 minutes
   - Method: GET
3. Save — your server stays warm 24/7

---

### Step 5 — Update Service Worker for Production

In `client/public/sw.js`, the cache name should be versioned for production:
```js
const CACHE_NAME = 'waqt-v1'  // increment this when deploying updates
```

---

### Step 6 — Add PWA Manifest

Create `client/public/manifest.json`:
```json
{
  "name": "Waqt-e-Namaz",
  "short_name": "Waqt",
  "description": "Prayer times for mosques in Karachi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#059669",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add to `client/index.html` `<head>`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#059669" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

Create simple 192×192 and 512×512 PNG icons (any green square with a crescent works) and place in `client/public/`.

---

### Step 7 — Verify End-to-End on Production

```
1. Open https://waqt-e-namaz.vercel.app
2. Register a new user account
3. Sign in → should land on /
4. Open /sign-in with super admin credentials → should land on /super
5. Create a city admin from super panel
6. Sign in as city admin → should land on /admin
7. Register a mosque with map pin
8. Create imam account
9. Sign in as imam → should land on /imam
10. Update prayer times → should see success toast
11. Sign in as user → go to home → see the mosque with updated times
12. Subscribe to mosque → allow notifications
13. Sign back in as imam → change a time
14. User should receive push notification within ~10 seconds
```

---

## 19. Environment Variables Reference

### `server/.env`
```env
# Server
PORT=4000
NODE_ENV=development

# CORS
CLIENT_URL=http://localhost:5173

# Supabase (new key format)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
JWT_SECRET=your_48_byte_hex_string_here

# VAPID (generate with: node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())")
VAPID_PUBLIC_KEY=BExample...
VAPID_PRIVATE_KEY=example...
VAPID_MAILTO=mailto:your@email.com

# Redis (from Upstash dashboard)
REDIS_URL=rediss://default:password@hostname.upstash.io:6379
```

### `client/.env.local`
```env
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=BExample...
```

---

## 20. File Structure Reference

```
waqt-e-namaz/
├── .gitignore
├── client/                          ← React + Vite (deploy to Vercel)
│   ├── index.html                   ← Leaflet CDN links here
│   ├── vite.config.js               ← HMR fix
│   ├── .env.local                   ← Never committed
│   ├── public/
│   │   ├── sw.js                    ← Service worker (offline + push)
│   │   ├── manifest.json            ← PWA manifest
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── src/
│       ├── main.jsx                 ← Provider stack + SW registration
│       ├── App.jsx                  ← Router + lazy pages + Protected guard
│       ├── styles/
│       │   ├── tokens.css           ← Spacing, radius, shadow, z-index tokens
│       │   ├── themes.css           ← 4 themes as CSS variable sets
│       │   ├── typography.css       ← Font imports + per-language vars
│       │   └── global.css           ← Reset + body + page-content + utilities
│       ├── i18n/
│       │   ├── index.js             ← resolve(), interpolate(), createTranslator()
│       │   └── locales/
│       │       ├── en.js            ← English strings
│       │       ├── ur.js            ← Urdu strings (RTL)
│       │       └── ar.js            ← Arabic strings (RTL)
│       ├── context/
│       │   ├── ThemeContext.jsx     ← 4 themes, localStorage persist
│       │   ├── LangContext.jsx      ← 3 languages, dir attr, t() function
│       │   └── AuthContext.jsx      ← JWT auth, localStorage, role helpers
│       ├── lib/
│       │   ├── supabase.js          ← Supabase client (publishable key only)
│       │   ├── api.js               ← All fetch calls, auto-401-logout
│       │   └── utils.js             ← getMaghribTime, getNextPrayer, formatTime12, etc.
│       ├── hooks/
│       │   ├── useMosques.js        ← Fetch + session cache + Maghrib enrich
│       │   ├── useNextPrayer.js     ← 30s interval countdown
│       │   ├── useAreas.js          ← In-memory cache
│       │   ├── useSubscriptions.js  ← Optimistic toggle
│       │   └── usePushSubscription.js ← VAPID permission + subscribe
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Button.jsx + .css
│       │   │   ├── Card.jsx + .css
│       │   │   ├── Badge.jsx + .css
│       │   │   ├── Skeleton.jsx + .css
│       │   │   ├── Toast.jsx + .css
│       │   │   └── BottomNav.jsx + .css
│       │   ├── layout/
│       │   │   ├── AppShell.jsx
│       │   │   ├── TopBar.jsx + .css
│       │   └── mosque/
│       │       └── MosqueCard.jsx + .css
│       └── pages/
│           ├── public/
│           │   ├── Home.jsx + .css
│           │   ├── Nearby.jsx + .css
│           │   ├── MosqueDetail.jsx + .css
│           │   ├── Subscriptions.jsx + .css
│           │   ├── Settings.jsx + .css
│           │   ├── SignIn.jsx + .css
│           │   └── Register.jsx
│           ├── imam/
│           │   ├── ImamPanel.jsx + .css
│           │   ├── EidForm.jsx
│           │   └── AuditLog.jsx
│           ├── admin/
│           │   ├── AdminPanel.jsx + .css
│           │   └── MosqueRegisterForm.jsx
│           └── super/
│               ├── SuperPanel.jsx + .css
│               └── (shares MosqueRegisterForm from admin/)
│
└── server/                          ← Node + Express (deploy to Render)
    ├── index.js                     ← App entry, routes, starts push worker
    ├── package.json                 ← "type": "module"
    ├── .env                         ← Never committed
    ├── lib/
    │   ├── supabase.js              ← supabase + supabaseAdmin clients
    │   ├── auth.js                  ← hashPassword, verifyPassword, signToken, verifyToken
    │   └── push.js                  ← BullMQ queue setup, queuePushNotification()
    ├── middleware/
    │   ├── requireAuth.js           ← JWT verify, attach req.user + req.role
    │   └── requireRole.js           ← Role guard factory
    ├── routes/
    │   ├── auth.js                  ← register, login, me, create-admin, create-imam, update-credentials
    │   ├── mosques.js               ← CRUD + geo endpoints + Haversine sort
    │   ├── times.js                 ← update times, post Eid, audit log, Maghrib
    │   ├── push.js                  ← subscribe, unsubscribe, my-subscriptions, announce
    │   └── admin.js                 ← audit, users, cities, areas, stats
    └── workers/
        └── pushWorker.js            ← BullMQ consumer, VAPID delivery, dead sub cleanup
```

---

*Document generated: April 2026 | Project status: MVP in active development*
*Developer: Mustafa (19, Karachi) | Stack: MERN + Supabase + BullMQ + Web Push*
