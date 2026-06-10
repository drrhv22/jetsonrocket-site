# Maintenance guide — jetsonrocket.net

## Making changes

1. Edit the HTML/CSS files (design tokens live at the top of `styles.css`).
2. `git add -A && git commit -m "describe the change"`
3. `git push`
4. Live at https://jetsonrocket.net in ~1 minute (GitHub Pages rebuilds on push).

Local preview first: `python3 -m http.server 8000` → http://localhost:8000

## Contact form (Web3Forms)

- The form in `contact.html` posts to `https://api.web3forms.com/submit`.
- The `access_key` hidden input ships with the placeholder `YOUR_WEB3FORMS_ACCESS_KEY`.
- Get a free key: https://web3forms.com → enter the business inbox address → the key
  arrives by email. Replace the placeholder, commit, push.
- Test after replacing: submit the form, confirm the inline success message and that
  the email arrives.
- **Pre-deploy gate:** `grep -r YOUR_WEB3FORMS_ACCESS_KEY .` should return nothing
  before pushing — a placeholder key means every visitor submission fails.

## Hosting & DNS

- **Host:** GitHub Pages, `main` branch, `/` root. `CNAME` file contains `jetsonrocket.net`.
- **DNS (at the domain registrar):**
  - `A` records on `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - `CNAME` on `www` → the GitHub Pages hostname (`<github-username>.github.io`)
  - Domain parking/forwarding: OFF
- **HTTPS:** repo Settings → Pages → custom domain `jetsonrocket.net` → "Enforce HTTPS"
  (certificate can take up to 24 h after DNS changes).

## Content rules (public repo — do not break these)

1. **Truth gate:** every claim must be literally true of the current operation.
   Banned until they become true: "team", "24/7", review scores, occupancy stats,
   response-time promises faster than "one to two business days".
2. **Privacy gate:** no client names, no property street addresses, no rents or lease
   terms anywhere in this repo. Regions and portfolio counts only.
3. Accessibility floor: labels on every form field, AA contrast for any new colors
   (token pairs in `styles.css` are pre-verified), `lang="es"` on Spanish text.

## Page map

| File | Purpose |
|---|---|
| `index.html` | Landing: hero, facts, services summary, regions, how it works, CTA |
| `services.html` | Five detailed service sections (anchors: #operations #placement #maintenance #compliance #reporting) |
| `owners.html` | Owner benefits, reporting, onboarding, FAQ |
| `contact.html` | Form + mailto fallback |
| `404.html` | Not-found (uses root-absolute paths on purpose) |
