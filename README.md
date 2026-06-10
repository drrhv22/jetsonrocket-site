# Jetson Rocket Property Management — jetsonrocket.net

Static marketing site for Jetson Rocket PM, an owner-operated property management
service working in the San Francisco Bay Area, Southern California, Central Texas,
and Michoacán, México.

Plain HTML/CSS/JS — no build step. Hosted on GitHub Pages behind `jetsonrocket.net`.

## Structure

```
index.html      Landing page
services.html   Detailed service offerings
owners.html     What property owners get, reporting, FAQ
contact.html    Contact form (Web3Forms) + email
404.html        Not-found page (root-absolute links, served at any path)
styles.css      Single shared stylesheet (design tokens at the top)
CNAME           Custom domain for GitHub Pages
MAINTENANCE.md  How to edit, deploy, DNS, and form-key setup
```

## Local preview

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Contact form

`contact.html` posts to [Web3Forms](https://web3forms.com). The access key in the
form is a placeholder (`YOUR_WEB3FORMS_ACCESS_KEY`) — get a free key at
web3forms.com (deliver to the business inbox) and replace it. Until then,
submissions return an error and the page shows the email fallback.

## Editing

Edit → commit → push to `main` → live in about a minute. See `MAINTENANCE.md`.

## Content rules

- Every claim on the site must be literally true of the current operation.
- No client names, property street addresses, rents, or lease details — ever.
  Regions and portfolio counts only.
