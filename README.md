# GAC — Goal Achievers website

Static website for Goal Achievers. The live page is the Event page (Senior Managers' Retreat, 27–29 November 2026, Abeokuta) plus Contact Us. Home, About Us, Founder and Vision & Mission open a "Coming soon" pop-up.

## Files
- `index.html` — the whole site (pages switch with `#event` and `#contact`)
- `logo.webp` — Goal Achievers logo
- `flyer.webp` — official retreat flyer

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Contact details
Edit the `CONTACT` list near the bottom of `index.html` to add phone, WhatsApp, email and office address.

## Deploy
No build step needed. Works on GitHub Pages, Vercel or Netlify as a static site.
