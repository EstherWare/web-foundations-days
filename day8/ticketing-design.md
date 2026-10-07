# TicketHub: Ticketing Platform Design

TicketHub is a consumer ticket marketplace for concerts, comedy, sports, and other
time-bound events. It is designed for trustworthy purchasing: customers should know
whether a seat is really available, pay without losing an active reservation, and
receive a ticket that can be verified at the gate. The platform can earn revenue
through a per-ticket service fee, event-promoter subscriptions, and optional
featured-event placement. Taxes, venue fees, and the service fee are shown before
the buyer confirms payment.

## 1. Requirements

### Functional requirements

1. **Discover events.** Customers can search and filter published events by city,
   date, category, venue, price range, and accessibility features. Event pages show
   the promoter, venue rules, ticket fees, refund policy, age guidance, and the
   event's local time.
2. **Inspect inventory.** Customers can view a mobile-friendly seat map, ticket
   tiers, prices, accessibility seats, and a freshness timestamp. General-admission
   events use quantity-based inventory rather than numbered seats.
3. **Reserve and buy.** An authenticated customer can hold a limited number of
   seats for 10 minutes. The checkout shows the complete total and accepts card,
   mobile-money, and other configured payment methods. A successful payment creates
   one ticket per seat.
4. **Deliver and use tickets.** Customers can view, download, or add tickets to a
   wallet. Each ticket has a signed, rotating QR/barcode and a human-readable
   fallback code. A gate scanner validates it online and atomically marks it used;
   duplicate scans are rejected.
5. **Manage the customer relationship.** Customers can see order history, resend
   confirmations, request eligible refunds or transfers, and receive email/SMS/push
   notifications for payment, event changes, and cancellations.
6. **Operate events.** Promoters can create events, configure venues and prices,
   publish inventory, set sale windows and purchase limits, view sales, issue
   approved refunds, and export settlement reports. Staff have separate
   least-privilege roles for support, finance, and gate scanning.
7. **Handle payment uncertainty.** Payment callbacks are verified and idempotent.
   A delayed or duplicated callback cannot create duplicate orders or tickets;
   an order remains `payment_pending` until a trusted provider result is received.

### Non-functional requirements

| Quality | Target and design response |
| --- | --- |
| **Speed** | Cached event pages p95 under 300 ms; seat-map reads p95 under 500 ms; hold responses p95 under 1 second when a customer has been admitted from the queue. |
| **Correctness** | Zero double-booked seats. The database is authoritative for holds, orders, and payments; cache data is never used to confirm a purchase. |
| **Fairness** | A waiting room admits customers in a signed FIFO order during a protected on-sale window. Per-account/device limits, bot detection, CAPTCHA/challenge escalation, and a maximum quantity per order reduce hoarding without blocking legitimate families. |
| **Availability** | 99.95% monthly availability normally and a protected-sale mode that degrades browsing gracefully while keeping the inventory writer available. |
| **Security and privacy** | TLS, secure sessions, hashed passwords, encrypted sensitive data, tokenized payment details (no card numbers stored), signed scanner tokens, audit logs, and data deletion/export controls. |
| **Accessibility** | Keyboard-operable controls, screen-reader labels, focus-safe seat selection, high contrast, reduced-motion support, and an equivalent way to request accessible seating. |
| **Recovery and observability** | RPO of at most 5 minutes and RTO of at most 30 minutes. Metrics, traces, structured logs, alerts for payment failures, queue age, hold expiry lag, and inventory conflicts are retained for investigation. |

## 2. Traffic and capacity estimates

These are planning estimates, not a claim that every visitor is online at the
same instant. A normal day has 50,000 visitors and 10 page views each, or
**500,000 page views/day**.

### Normal day

Using 86,400 seconds per day:

- Average page-read rate: `500,000 / 86,400 = 5.8 requests/second`.
- Planning peak at 5x average: **about 29 page requests/second**.
- 5,000 tickets sold/day is **0.058 completed ticket sales/second** on average.
- At 5x, completed sales are **about 0.29/second**. Hold attempts are higher
  than completed sales, so the inventory writer is sized for at least 10 writes
  per second in normal operation, with headroom for retries and expirations.

### Popular concert sale

During a 10-minute on-sale window, 200,000 people compete for 20,000 seats.
This is a 10x oversubscription, so the design must reject most requests
predictably instead of letting them overload the checkout path.

- If each interested customer makes 15 event/queue/seat requests during the
  window, that is `200,000 x 15 / 600 = 5,000 requests/second`.
- All 200,000 people may attempt a hold, averaging **333 hold attempts/second**.
  A first-minute rush can be roughly 3x that average: **about 1,000 attempts/second**.
- Only 20,000 seats can become successful holds or sales. The other requests
  should receive a clear sold-out, rate-limited, or queue response, not a
  database error.

| Metric | Normal planning peak | Popular-sale planning peak | Increase |
| --- | ---: | ---: | ---: |
| Page/event/seat reads | 29 req/s | 5,000 req/s | about 172x |
| Hold attempts | 10 req/s capacity | 333 avg; 1,000 burst | at least 33x avg |
| Seats in the sale | event-dependent | 20,000 | inventory is finite |
| Interested customers | 50,000/day | 200,000/10 min | flash crowd |

The waiting room absorbs the 200,000-person burst before customers reach the
hold service. CDN and cache layers serve immutable event content, while the
small, strongly consistent inventory path is protected from read traffic.

## 3. API design

All mutating endpoints accept an `Idempotency-Key`. Access tokens are scoped to
the customer or promoter role. Responses use `ETag`/`If-None-Match` for cacheable
reads and return a correlation ID for support.

### `GET /v1/events`

Search published events. Query parameters include `city`, `category`, `from`,
`to`, `minPrice`, `maxPrice`, `cursor`, and `limit` (maximum 50).

```json
{
  "items": [{
    "id": "evt_8f2",
    "name": "Nairobi Jazz Nights",
    "venue": "Uhuru Gardens",
    "startsAt": "2026-12-12T19:00:00+03:00",
    "currency": "KES",
    "fromPrice": 2500,
    "availability": "limited"
  }],
  "nextCursor": "eyJwYWdlIjoyfQ"
}
```

### `GET /v1/events/{eventId}`

Returns the event details, sale window, venue policy, fee explanation, refund
policy, and links to the inventory version.

### `GET /v1/events/{eventId}/seats`

Returns a paginated or section-filtered seat map. It exposes only
`available`, `unavailable`, and the requesting customer's own `held` state; it
does not reveal another customer's identity or hold expiry. A `version` and
`asOf` timestamp tell the client when the snapshot was generated.

### `POST /v1/events/{eventId}/holds`

Body: `{"seatIds":["seat_a12","seat_a13"]}`. The server checks queue admission,
purchase limits, and price locks, then atomically creates a hold for 10 minutes.
It returns `201 Created` with `holdId`, `expiresAt`, seat IDs, and a fee-inclusive
total. It returns `409 Conflict` when any requested seat cannot be held, and
`429 Too Many Requests` when an account or device exceeds limits.

### `DELETE /v1/holds/{holdId}`

Releases an active hold when the customer abandons checkout. Expiry workers also
release holds, so a lost browser cannot strand inventory.

### `POST /v1/orders`

Body: `{"holdId":"hold_72k","paymentMethod":"mpesa","returnUrl":"..."}`.
The server verifies that the hold belongs to the customer and has not expired,
creates one order, and starts a provider checkout. It returns `202 Accepted` with
`orderId` and `paymentStatus: "pending"`. The client polls the order or listens
for a notification; it never treats a redirect alone as proof of payment.

### `GET /v1/me/orders/{orderId}` and `GET /v1/me/tickets`

The first returns the order total, fee breakdown, payment state, refund state,
and event details. The second returns active tickets and signed QR payload
metadata. Both are scoped to the authenticated customer.

### `POST /v1/scanner/validate`

For an authorized scanner, the body contains the signed ticket token, event, and
gate. The server verifies the signature and event, then atomically changes the
ticket from `valid` to `used`. It returns `409 Conflict` for a previously used
ticket and records the scanner, gate, and timestamp in an audit log.

## 4. Data model

The production database is relational because seat ownership, payments, and
refunds require foreign keys, unique constraints, and transactions. Money is
stored as integer minor units (for example, cents), never floating-point values.

```text
users 1 ───< orders 1 ───< tickets >─── 1 seats >─── 1 events
                  │             │
                  └──< payments └──< ticket_scans

events 1 ───< seats
seats 1 ───< seat_holds >─── 1 users
```

### Core tables

- **`users`** (`id` PK, `email` UNIQUE, `phone` UNIQUE, `password_hash`,
  `role`, `created_at`, `deleted_at`). One user can place many orders and holds.
- **`events`** (`id` PK, `promoter_id` FK to `users`, `venue_name`,
  `starts_at`, `status`, `sale_opens_at`, `sale_closes_at`, `currency`,
  `published_at`). An event belongs to a promoter and has many seats.
- **`seats`** (`id` PK, `event_id` FK, `section`, `row_label`, `number`,
  `price_minor`, `accessibility_type`, `state`, `version`). Add
  `UNIQUE(event_id, section, row_label, number)` so a venue seat is defined once.
  `state` is a projection for reads; ownership is proven by a hold/order record.
- **`seat_holds`** (`id` PK, `seat_id` FK, `user_id` FK, `expires_at`,
  `status`, `created_at`). Add a partial unique index on `seat_id` for active
  holds, or enforce the equivalent constraint in the inventory transaction.
- **`orders`** (`id` PK, `user_id` FK, `hold_id` FK, `status`,
  `subtotal_minor`, `fee_minor`, `tax_minor`, `total_minor`, `currency`,
  `idempotency_key`, `created_at`). Add `UNIQUE(user_id, idempotency_key)`.
- **`payments`** (`id` PK, `order_id` FK, `provider`, `provider_reference`
  UNIQUE, `status`, `amount_minor`, `received_at`). A provider callback can be
  safely delivered more than once.
- **`tickets`** (`id` PK, `order_id` FK, `seat_id` FK, `token_hash` UNIQUE,
  `status`, `issued_at`, `used_at`). Add `UNIQUE(order_id, seat_id)` so one order
  cannot issue the same seat twice.
- **`ticket_scans`** (`id` PK, `ticket_id` FK, `scanner_id` FK, `gate`,
  `scanned_at`, `result`) provides an immutable entry audit trail.

### How double-booking is prevented

The hold endpoint opens a database transaction, locks the requested seat rows in
a stable ID order, and performs these checks on the primary database:

1. Expired holds are released (or ignored) and a currently active hold or sold
   ticket makes the seat unavailable.
2. The transaction inserts the hold and updates the seat projection only if the
   seat is still available. A database constraint/partial unique index rejects a
   second active hold even if two application servers race.
3. The order is created from that hold. Payment confirmation uses another
   transaction that locks the order and hold, verifies the amount and expiry
   grace policy, marks the payment received, marks the seats sold, and inserts
   tickets.
4. If a constraint or serialization conflict occurs, the transaction rolls back
   and the losing customer receives `409 Conflict`; it never receives a
   success-shaped response.

Redis may make availability fast, but it is only a cache and a short-lived
queue/lock hint. It cannot grant ownership. A sweeper releases expired holds,
with a monitored retry queue, so abandoned reservations return to inventory.

## 5. Architecture

```text
 Customers / Promoters / Scanners
                |
        CDN + WAF + bot checks
                |
       Load balancer / API gateway
          |                 |
          v                 v
   Virtual waiting room   Stateless API servers
 (signed FIFO admission)   |       |        |
                            |       |        +--> Notification service
                            |       +----------> Payment adapter/webhooks
                            v
                    Inventory service
                            |
          +-----------------+------------------+
          v                                    v
   SQL primary + replicas              Redis cache (non-authoritative)
          |                                    |
          v                                    v
   Queue / event bus ----------> expiry, ticket, email/SMS workers
          |
          v
   Object storage + CDN (ticket PDFs, event media)

 Observability: metrics, logs, traces, audit store, alerts
```

- **CDN, WAF, and bot checks** serve cacheable event content at the edge and
  block abusive traffic before it reaches the application.
- **Waiting room** gives each admitted customer a signed, short-lived admission
  token. It makes fairness measurable and caps concurrent hold attempts for a
  specific event.
- **API gateway and stateless servers** authenticate users, apply rate limits,
  validate input, and scale horizontally behind a load balancer.
- **Inventory service** is the only component allowed to grant or sell seats. It
  uses the SQL primary and short transactions; it does not depend on a stale
  read replica.
- **SQL primary and replicas** keep relational writes correct while replicas and
  cache serve event pages and non-critical reads. Connection pooling prevents
  200,000 clients from becoming 200,000 database connections.
- **Redis** caches event metadata and recent availability snapshots and stores
  rate-limit counters. Cache invalidation follows committed inventory events.
- **Queue/workers** process payment notifications, hold expiry, ticket generation,
  notifications, and retries without blocking checkout. A dead-letter queue
  makes failures visible rather than silently losing work.
- **Payment adapters** isolate provider-specific card or mobile-money behavior.
  Webhook signatures, amount checks, and idempotency protect the order state.
- **Object storage/CDN** stores ticket documents and event images outside the
  transactional database.
- **Observability and audit storage** show queue age, p95 latency, conflict rate,
  payment reconciliation, and every gate decision.

During a big sale, the waiting room and CDN absorb the flash crowd; autoscaled
API servers handle admitted customers; and the inventory database sees bounded,
fairly admitted attempts instead of the full 5,000-request-per-second burst.
If the queue or cache is degraded, browsing can be read-only, but the platform
fails closed for inventory rather than risking an incorrect sale.

## 6. Trade-offs

1. **Strict SQL inventory vs. maximum write throughput.** Row locks and serializable
   transactions add contention and limit raw writes, but they provide a simple,
   auditable correctness boundary for a scarce seat. The waiting room and
   partitioning by event absorb the scale without weakening that guarantee.
2. **FIFO waiting room vs. instant access.** A queue adds friction and means a
   customer may wait even while seats appear available. In exchange, it gives a
   transparent order of access, protects the checkout service, and is harder for
   bots to exploit than a race based on refresh speed.
3. **Short holds vs. customer completion time.** Ten minutes improves turnover and
   discourages hoarding, but payment providers can be slow. A small, explicit
   payment grace period for a started provider transaction is fairer than silently
   expiring a paid checkout; it requires reconciliation and careful inventory
   states.
4. **Read replicas/cache vs. freshness.** Replicas and cached maps make browsing
   affordable during a flash crowd, but may briefly show stale availability. The
   UI labels snapshots as approximate, and every hold is rechecked on the primary
   database so stale reads cannot cause a double booking.
