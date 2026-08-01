# Screenshot Guide

This is the single source of truth for every screenshot referenced from the root
[`README.md`](../../README.md) and [`README-ADMIN.md`](../../README-ADMIN.md). Filenames below are
exact and must match byte-for-byte what the READMEs link to.

All 14 screenshots below are captured and active in the READMEs. If any ever needs to be
recaptured, replace the file in place under the same exact name/path - nothing else needs to
change.

---

## Public screenshots (`docs/screenshots/public/`)

| Filename | Route/page | Required content | Recommended viewport | Privacy check |
| --- | --- | --- | --- | --- |
| `01-public-home.png` | `/` | Hero section, featured vehicles, primary nav | 1440×900 | No PII |
| `02-vehicle-catalog.png` | `/cars` | Catalog grid with at least one filter applied | 1440×900 | No PII |
| `03-vehicle-detail.png` | `/auto/:id` | Full vehicle detail (images, specs, price) | 1440×900 | No PII |
| `04-favorites.png` | `/favourites` | Favorites list with 2+ saved vehicles | 1440×900 | No PII |
| `05-public-financing.png` | `/financing` | Loan calculator with sample inputs filled in | 1440×900 | No PII |
| `06-contact-inquiry.png` | `/contact` | Contact/inquiry form with sample (non-real) data | 1440×900 | No PII |

> **No Cart screenshot.** A codebase audit found no Cart/basket/checkout page, route, component,
> context, or persisted state anywhere in this project (only Favorites exists as a
> save-for-later feature). `README.md` does not claim AutoMarket has a Cart, and no `cart`-named
> file is part of this set. If a real Cart feature is ever added, give it the next free number in
> this table (`07-cart.png`) rather than reusing an existing one.

## Admin screenshots (`docs/screenshots/admin/`)

| Filename | Route/page | Required content | Recommended viewport | Privacy check |
| --- | --- | --- | --- | --- |
| `01-admin-login-demo-access.png` | `/admin/login` | Login form with the "Demo Access" modal open | 1440×900 | No real credentials visible |
| `02-admin-dashboard.png` | `/admin` | Populated stats, charts, recent sales/messages, **Demo Mode badge** | 1440×900 | Fictional data only |
| `03-admin-inventory.png` | `/admin/cars` | Vehicle list with sold/available/featured badges visible | 1440×900 | No PII |
| `04-admin-sales.png` | `/admin/sales` | Sales list with 2+ fictional sample sales | 1440×900 | No real buyer PII |
| `05-admin-financing.png` | `/admin/financing` | Financing applications list with status filters | 1440×900 | No real applicant PII |
| `06-admin-messages.png` | `/admin/messages` | Message inbox with read/unread mix | 1440×900 | No real sender PII |
| `07-admin-ai-assistant.png` | `/admin/ai` | A sample AI conversation about business data | 1440×900 | No PII in the conversation |
| `08-admin-invoice-document.png` | Sale detail → generated PDF invoice | A sample invoice with fictional buyer/vehicle data | 1440×900 | Fictional buyer data only |

---

## Capture requirements (all screenshots)

- **Format:** PNG only.
- **Viewport:** desktop, ~1440px wide (1440×900 recommended); keep viewport and zoom level
  consistent across every screenshot in the set.
- **No browser chrome noise:** no DevTools panel open, no visible console errors.
- **No secrets, ever:**
  - no Firebase ID token or Authorization header visible (Network tab, URL bar, etc.)
  - no API key of any kind
  - no service-account file path or contents
  - no real administrator password
  - no other private credential
- **Only fictional/sample data:** no real customer names, emails, phone numbers, addresses, or
  identity/license document images - this project's sample data is already fictional; keep it that
  way in every capture.
- **Demo Mode badge:** must be visible in every admin screenshot captured while signed in as the
  demo account (it appears in the sidebar under "Admin Panel").
- **Crop consistently:** same browser chrome (or none) and margins across the whole set.
- **Optimize, don't degrade:** compress PNGs for repo size, but never to the point that on-screen
  text becomes unreadable.

## Owner instructions (to recapture any screenshot)

1. Open the correct route from the tables above (local dev or the live deployment).
2. Prepare representative fictional/sample data if the page's current data has changed.
3. Capture the screenshot at the recommended viewport.
4. Save it as a **real PNG** under the **exact** filename listed above (overwriting the existing
   file) - a JPEG saved with a `.png` extension is not a valid PNG; re-export or convert it first.
5. Place it in the exact `docs/screenshots/public/` or `docs/screenshots/admin/` folder.
6. Verify no private information is visible (re-check the privacy checklist above).
7. The README image blocks already reference these exact paths - no README edit is needed unless
   the filename itself changes.
8. Preview the README rendering (e.g. GitHub's preview, or a local Markdown previewer) before
   committing.
