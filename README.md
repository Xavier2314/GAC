# GAC — Goal Achievers website

Static website for Goal Achievers. The live page is the Event page (Senior Managers' Retreat, 20–23 November 2026, Abeokuta) plus Contact Us. Home, About Us, Founder and Vision & Mission open a "Coming soon" pop-up.

## Payment check before registration
Visitors pay ₦100,000 into **OPay 8108229724 (Awotipe Roseline)**, then upload their receipt on the event page.
`api/verify-receipt.js` (a Vercel serverless function) sends the receipt to Claude, which reads the amount, recipient, status and transaction reference. The registration form link is returned only when:

- every file is a payment receipt with a successful status (up to 6 receipts for people who paid in parts)
- each receipt is a different transfer, and together they add up to ₦100,000 × the number of people being paid for (1–10)
- no receipt has already been used by someone else (remembered in the private `gac-receipts` Vercel Blob store; the same phone can re-check its own receipts)

Overpayments still pass, and step 3 tells the visitor how much extra they paid. The extra is also recorded in the function logs.
- the recipient account number (full or masked) or the account name matches
- the receipt doesn't look edited

### Required Vercel settings
- `ANTHROPIC_API_KEY`: your Anthropic API key (Vercel → Project → Settings → Environment Variables)
- `BLOB_READ_WRITE_TOKEN`: added automatically by the `gac-receipts` Blob store. Without it the site still works but can't spot receipts reused by different people.
- `REGISTRATION_FORM_URL` (optional): overrides the Google Form link in `api/verify-receipt.js`

### Limits
- A receipt screenshot can be faked. Each check is logged in the Vercel function logs (amount, reference, sender, date), so cross-check references against the OPay statement before confirming a seat.
- Anyone who already has the Google Form link can still open it directly. Add a required "Transaction reference" question to the form and only accept entries whose reference appears in the OPay statement.

## Files
- `index.html`: the site (Event and Contact pages; Home, About Us, Founder and Vision & Mission show a coming-soon pop-up)
- `styles.css`, `app.js`: design and behaviour
- `vendor/`: GSAP, ScrollTrigger and Lenis
- `api/verify-receipt.js`: receipt checker
- `lib/ledger.js`: remembers used receipts
- `logo.webp`: Goal Achievers logo

## Run locally
```bash
npm install
npx vercel dev
```

## Design and motion
`styles.css` and `app.js` hold the premium design: loader, rising embers with shooting stars, split-text reveals, smooth scrolling, a parallax Abeokuta landscape, magnetic buttons and a soft cursor ring. The animation libraries (GSAP 3.12.5 with ScrollTrigger, Lenis 1.1.13) are served from `vendor/`, so the site doesn't depend on a CDN. Everything stays readable when JavaScript is off or the visitor prefers reduced motion.
