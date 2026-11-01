# GAC — Goal Achievers website

Static website for Goal Achievers. The live page is the Event page (Senior Managers' Retreat, 27–29 November 2026, Abeokuta) plus Contact Us. Home, About Us, Founder and Vision & Mission open a "Coming soon" pop-up.

## Payment check before registration
Visitors pay ₦100,000 into **OPay 8108229724 (Awotipe Roseline)**, then upload their receipt on the event page.
`api/verify-receipt.js` (a Vercel serverless function) sends the receipt to Claude, which reads the amount, recipient, status and transaction reference. The registration form link is returned only when:

- the file is a payment receipt with a successful status
- the amount is ₦100,000 or more
- the recipient account number (full or masked) or the account name matches
- the receipt doesn't look edited

### Required Vercel settings
- `ANTHROPIC_API_KEY`: your Anthropic API key (Vercel → Project → Settings → Environment Variables)
- `REGISTRATION_FORM_URL` (optional): overrides the Google Form link in `api/verify-receipt.js`

### Limits
- A receipt screenshot can be faked. Each check is logged in the Vercel function logs (amount, reference, sender, date), so cross-check references against the OPay statement before confirming a seat.
- Anyone who already has the Google Form link can still open it directly. Add a required "Transaction reference" question to the form and only accept entries whose reference appears in the OPay statement.

## Files
- `index.html`: the site (Event and Contact pages; Home, About Us, Founder and Vision & Mission show a coming-soon pop-up)
- `api/verify-receipt.js`: receipt checker
- `logo.webp`: Goal Achievers logo

## Run locally
```bash
npm install
npx vercel dev
```
