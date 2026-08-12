# Migrate Transactional Email to Resend — Design

## Background

All transactional email is sent through SendGrid from two edge functions, `notify-proposal` and `onboarding-reminders`. Each carries its own private copy of a `sendSendgrid()` helper and its own `FROM_EMAIL` / `FROM_NAME` constants.

On 2026-08-12 staff and customers reported that no email was arriving. Investigation established that the application side is healthy:

- The function is invoked normally (edge logs show traffic through 13:07 UTC that day).
- It boots and responds (live probe returned `400` in 852ms).
- It passes its throttle and owner checks and reaches the send call (`proposals.last_view_email_at` updated 13:05:50 UTC).
- SendGrid returned a 2xx to every send. `sendSendgrid` logs `console.error` on both a missing key and a non-2xx response, and neither appeared in a week of logs. That silence was verified as meaningful by deliberately provoking a `SyntaxError`, which appeared in `function_logs` immediately.
- Sender authentication is intact: SPF includes `sendgrid.net`, both SendGrid DKIM CNAMEs resolve (`u7360742`), DMARC is `p=none`.

SendGrid was therefore accepting mail with a success response and delivering nothing, to every recipient across multiple domains — the signature of an account-level suspension or compliance hold. The decision is to move to Resend.

`shoothill.com` is already verified as a sending domain in Resend, so no DNS work is required.

## Goals

1. Send all transactional email via Resend instead of SendGrid.
2. Replace the two duplicated `sendSendgrid()` helpers with one shared module.
3. Handle Resend's ~2 requests/second rate limit, which SendGrid did not impose.
4. Preserve existing per-call-site behaviour exactly — this changes the provider, not the product.

## Non-goals

- **Delivery confirmation via webhooks.** Tempting, given the outage went unnoticed for days, but it would not have caught this one: SendGrid returned `202 Accepted` and dropped the mail, so there was nothing to log. Real confirmation needs Resend's `email.bounced` / `email.delivered` webhooks and somewhere to record them. Worth doing, separately.
- **Keeping SendGrid as a fallback.** SendGrid is the component currently accepting mail and silently discarding it; falling back to it adds no verifiable resilience while doubling the config surface.
- Changing email content, recipients, or which events send mail.
- HTML email. All current mail is plain text and stays that way.
- Migrating `create-user`, which sends no email.

## Architecture

A new shared module, `supabase/functions/_shared/email.ts`, owns *how we talk to the provider and who we are from*. Call sites own *who receives this particular message*. That boundary is why `FROM_EMAIL` / `FROM_NAME` move into the module while the CC lists stay with their callers.

The CC lists differ today and deliberately stay different: `notify-proposal` CCs both `sj@shoothill.com` and `patrick.howe@shoothill.com`; `onboarding-reminders` CCs only `sj@shoothill.com`. Unifying them would start CC'ing Patrick on reminders, which is a product change, not a migration.

`sj@shoothill.com` was confirmed a live mailbox and is left as-is.

### Interface

```ts
export interface EmailRecipient { email: string; name?: string }

export type SendResult =
  | { ok: true;  id: string }
  | { ok: false; reason: "no-api-key" | "email-failed"; status?: number };

export interface EmailDeps {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export async function sendEmail(
  args: { to: EmailRecipient; cc?: EmailRecipient[]; subject: string; text: string },
  deps?: EmailDeps,
): Promise<SendResult>;
```

The optional `deps` argument exists so the logic can be unit-tested without network or credentials. Production call sites omit it and get the real implementations.

The module retains the existing self-filtering rule: any address appearing in `cc` that equals the `to` address (case-insensitive) is dropped, so nobody is ever both.

On success the Resend message `id` is returned. It is the handle needed to look a message up in Resend's dashboard; SendGrid gave us no equivalent.

### Payload mapping

Resend differs from SendGrid in four ways that matter:

| | SendGrid | Resend |
|---|---|---|
| Endpoint | `POST /v3/mail/send` | `POST https://api.resend.com/emails` |
| Sender | `{ email, name }` object | one string: `"Name <email>"` |
| Recipients | nested `personalizations[].to[]` | flat `to: []` / `cc: []` |
| Body | `content: [{ type, value }]` | `text:` |
| Success | `202`, empty body | `200`, `{ "id": "..." }` |

```json
{
  "from": "Shoothill Proposal Manager <proposals@shoothill.com>",
  "to": ["Patrick Howe <patrick.howe@shoothill.com>"],
  "cc": ["Simon Jeavons <sj@shoothill.com>"],
  "subject": "Proposal viewed: Audit & Rebuild - Example Ltd",
  "text": "Hi Patrick, ..."
}
```

Resend accepts `Name <email>` in `to` and `cc`, so display names survive the migration. A display name containing `,`, `"`, `<`, `>`, or a newline would corrupt the header, so the module falls back to the bare address when the name is not safe to inline.

Authentication is `Authorization: Bearer $RESEND_API_KEY`, from a new Supabase secret.

## Rate limiting

Resend permits roughly 2 requests/second. Several paths already burst past that:

| Path | Consecutive sends |
|---|---|
| `signed` | owner email + onboarding-draft email = 2 |
| `nda-signed` | customer + preparer = 2 |
| `nda-resent` | contact + preparer = 2 |
| `onboarding-signed-off` | assignee + customer = 2 |
| `onboarding-reminders` | unbounded — one per overdue onboarding |

`sendEmail` therefore serialises all sends through a module-level promise chain enforcing a minimum 550ms gap, and retries on `429` and `5xx`. Other `4xx` responses (malformed address, auth failure) fail immediately — retrying a bad request only wastes time.

Retry budget is **3 attempts in total** — the initial request plus at most 2 retries — with a 1s delay before the second attempt and 2s before the third. When the response carries a `Retry-After` header, its value replaces that delay.

**Known limitation:** the throttle is per function instance, not global. Two simultaneous proposal views execute in separate instances and can momentarily exceed 2/sec; the `429` retry is what covers that case. The throttle's job is to stop the reminders loop from sustained sawing through the limit. A globally correct limiter needs shared state (a DB table or Redis) and is not justified at this volume.

## Cron timeout

Spacing sends out makes `onboarding-reminders` slower, and its cron already exceeds pg_net's 5s default: the 2026-08-12 08:00 run recorded `Timeout of 5000 ms reached` in `net._http_response`. The function still runs to completion, so reminders are still sent, but the database never observes the outcome — `cron.job_run_details` reports `succeeded` merely because the request was queued.

Because this change makes that worse, a migration raises the job's `timeout_milliseconds` to 60000 so the cron can observe real success. This re-schedules `onboarding-reminders-daily` following the pattern in `20260422160000_schedule_onboarding_reminders_cron.sql` (unschedule if exists, then re-create).

## Call-site changes

Behaviour is preserved exactly:

- Paths returning `502` on send failure keep doing so: `signed`, `adhoc-signed`, `onboarding-report-sent`.
- Fire-and-forget view paths keep ignoring the result; the module logs `console.error` on failure.
- `onboarding-reminders` pushes `reason: "email-failed"` instead of `"sendgrid-failed"` into its `skipped` array. Nothing outside the function reads this string — the response goes to `pg_net` and is discarded — so it is a safe rename.
- The `// ─── SendGrid ───` section headers are retitled.

Both functions delete their local `sendSendgrid`, `FROM_EMAIL`, and `FROM_NAME` and import `sendEmail` from `../_shared/email.ts`.

## Testing

The payload mapping, CC self-filtering, display-name fallback, throttle spacing, and retry logic are pure logic, unit-testable via injected `deps` with no network, no credentials, and no live mail. Written first, per TDD:

1. `from` is formatted `"Name <email>"`.
2. A display name containing a comma or quote falls back to a bare address.
3. A CC equal to the `to` address is dropped, case-insensitively.
4. A CC list that is empty after filtering omits the `cc` key entirely.
5. Missing `RESEND_API_KEY` returns `{ ok: false, reason: "no-api-key" }` and sends no request.
6. A `200` response returns `{ ok: true, id }` parsed from the body.
7. A `429` is retried, and succeeds if the retry succeeds.
8. `Retry-After` is honoured when present.
9. A `422` is not retried.
10. Retries give up after 3 total attempts and return `{ ok: false, reason: "email-failed", status }`.
11. Two consecutive sends are spaced by at least 550ms.

## Rollout

1. Add the `RESEND_API_KEY` secret to the Supabase project.
2. Apply the cron timeout migration.
3. Deploy both functions via the CLI (there is no CI workflow for edge functions).
4. Trigger one real send and confirm the mail physically arrives.
5. Delete `SENDGRID_API_KEY` only after arrival is confirmed.

## Follow-ups

- Resend bounce/delivery webhooks recorded to a table, so a silent delivery failure surfaces without someone noticing missing mail.
- Check the SendGrid account for a suspension or compliance notice. Even after migrating, the reason matters: if it was a billing or abuse issue it may recur elsewhere, and it confirms the diagnosis.
