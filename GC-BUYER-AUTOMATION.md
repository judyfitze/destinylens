# DestinyLens — Global Control Buyer Automation

**Created:** May 23, 2026
**Status:** ✅ LIVE

---

## Tag

| Field | Value |
|-------|-------|
| **Name** | Buyer-DestinyLens |
| **ID** | 6a11ef3c9623b6235f615a48 |
| **Description** | Purchased DestinyLens ($47) |
| **Group** | Newsletter (69b08c36277102e8dfe5aa1c) |
| **Workflow** | DestinyLens - Buyer Delivery |
| **Contacts** | 0 (ready to receive) |

---

## Workflow

| Field | Value |
|-------|-------|
| **Name** | DestinyLens - Buyer Delivery |
| **ID** | 6a1395269623b6235fb60086 |
| **Status** | Active |
| **Share Code** | a46666cb-7e9f-4c57-ab91-ae6f12873175 |
| **Domain** | sm.destinylens.io |
| **Flows** | 13 (7 emails + 6 timers) ✅ |
| **From Email** | hello@destinylens.io |
| **Content** | ✅ All emails have subjects and bodies |

---

## 7-Email Sequence

| # | Name | Type | Timing | Subject |
|---|------|------|--------|---------|
| 1 | Email 1 - Welcome | send_email | Immediate | Welcome to DestinyLens — Your Dream Life Starts Now |
| 2 | Timer - Day 1 | timer | Wait 1 day | — |
| 3 | Email 2 - Getting Started | send_email | Day 1 | Day 1: Your first calculation changes everything |
| 4 | Timer - Day 2 | timer | Wait 1 day | — |
| 5 | Email 3 - First Calculation | send_email | Day 2 | Day 2: Did you hit your number today? |
| 6 | Timer - Day 3 | timer | Wait 1 day | — |
| 7 | Email 4 - Dashboard Walkthrough | send_email | Day 3 | Day 3: Your Visual Command Center explained |
| 8 | Timer - Day 5 | timer | Wait 2 days | — |
| 9 | Email 5 - Income Connections | send_email | Day 5 | Day 5: Connect your income — watch the magic |
| 10 | Timer - Day 7 | timer | Wait 2 days | — |
| 11 | Email 6 - Community + Bonuses | send_email | Day 7 | Day 7: Your bonuses + the community waiting for you |
| 12 | Timer - Day 14 | timer | Wait 7 days | — |
| 13 | Email 7 - Scale + Next Steps | send_email | Day 14 | Day 14: You're not the same person who started |

---

## Email Content Summary

### Email 1 — Welcome (Immediate)
- Access member area
- Complete calculator
- Connect income source
- CTA: Enter Dashboard

### Email 2 — Getting Started (Day 1)
- Why the first calculation matters
- Brain starts scanning for opportunities
- CTA: Run Calculator

### Email 3 — First Calculation (Day 2)
- The daily question: "Did I hit my number?"
- Shift from hoping to tracking
- CTA: Check Dashboard

### Email 4 — Dashboard Walkthrough (Day 3)
- 3 zones: Gauge, Stream, Goals
- Pro tip: 3 goals max
- CTA: Open Dashboard

### Email 5 — Income Connections (Day 5)
- Stripe, PayPal, Shopify, Manual
- One connection = real-time updates
- CTA: Connect Income

### Email 6 — Community + Bonuses (Day 7)
- All 5 bonuses listed with values
- Total value: $405
- CTA: Access All Bonuses

### Email 7 — Scale + Next Steps (Day 14)
- Transformation recap
- Measurement > motivation
- CTA: View Progress

---

## How to Trigger

When someone purchases DestinyLens:

```bash
# Fire the tag (auto-creates contact if new)
curl -X POST \
  -H "X-API-KEY: ***" \
  -H "Content-Type: application/json" \
  --data-binary '{"email":"buyer@example.com","firstName":"Name"}' \
  "https://api.globalcontrol.io/api/ai/tags/fire-tag/6a11ef3c9623b6235f615a48"
```

Or use the `/tag` command with OpenClaw:
- Tag: `Buyer-DestinyLens`
- Contact: buyer email/name

**What happens:**
1. Contact is created (if new)
2. Tag `Buyer-DestinyLens` is applied
3. Workflow `DestinyLens - Buyer Delivery` fires immediately
4. Email 1 sends instantly
5. Timer waits 1 day → Email 2 sends
6. Timer waits 1 day → Email 3 sends
7. Timer waits 1 day → Email 4 sends
8. Timer waits 2 days → Email 5 sends
9. Timer waits 2 days → Email 6 sends
10. Timer waits 7 days → Email 7 sends

---

## Notes

- All emails link to live pages on https://destinylens.io
- Timer delays: 1 day, 1 day, 1 day, 2 days, 2 days, 7 days
- Workflow is active and ready to receive contacts
- Tag is linked to workflow (fires automatically when applied)
