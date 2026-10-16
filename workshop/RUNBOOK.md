# Plasmic workshop — runbook

## Links

| | |
| --- | --- |
| Studio | https://studio.plasmic.app/projects/pFNAbUTdtFsNUazgshtx6S |
| Roatan page (`main`) | https://studio.plasmic.app/projects/pFNAbUTdtFsNUazgshtx6S/-/Sandals-Roatan-Resort-Overview-US?arena_type=page&arena=EqhkmPk7ksoV |
| Live | https://plasmic-workshop.vercel.app · host `/plasmic-host` · demo `/workshop-demo` |
| Purge | `https://plasmic-workshop.vercel.app/api/revalidate-cache?secret=<NEXT_CACHE_REVALIDATE_SECRET>` (secret: `.vercel/secrets.local.txt`) |
| Repo | https://github.com/jorge-pizzati-uvi/plasmic-workshop |
| Deck | https://claude.ai/artifact/MaZPRatag3bYG1stXpT8Cn |
| Behaviour reference | https://www.sandals.com/royal-curacao/ |
| Docs | https://github.com/sanservices/beaches-v13-frontend/tree/feat/plasmic-poc/plasmic-docs |

## Before session 1

- [ ] Channel: post message below; pin public token (`.env.local` → `NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN`)
- [ ] Questions doc created, linked in channel
- [ ] Session 2 on calendars (2–3 days out); Plasmic follow-up call requested
- [ ] Studio: page `Workshop demo` at `/workshop-demo` on `main`, empty
- [ ] Rehearse demo once; keep result on branch `feat/demo-finished`, demo clean on `main`
- [ ] Morning: `yarn dev` restarted; `curl -I https://plasmic-workshop.vercel.app/plasmic-host` → 200; Studio opens on `main`; **Get posts (demo)** under Data queries → Custom function; tabs open: deck, Studio, VS Code (`lib/plasmic/data/posts.ts`), royal-curacao, this file; timer

Channel message:

> **Plasmic workshop, session 1 tomorrow.** Before we start (~20 min):
> 1. Accept the Studio invite, open the project once: https://studio.plasmic.app/projects/pFNAbUTdtFsNUazgshtx6S
> 2. Optional: `git clone https://github.com/jorge-pizzati-uvi/plasmic-workshop && cd plasmic-workshop && yarn && cp .env.example .env.local && yarn dev` → set `NEXT_PUBLIC_PLASMIC_PROJECT_ID=pFNAbUTdtFsNUazgshtx6S` and the pinned token → http://localhost:3000/plasmic-host blank = OK
> 3. Skim https://github.com/sanservices/beaches-v13-frontend/blob/feat/plasmic-poc/plasmic-docs/README.md
>
> Behaviour reference for everything we build: https://www.sandals.com/royal-curacao/

## Session 1

### 0–20 · Deck

cover → answer → problem-alt → model → modes → contract → change → data → ship → demo → gotchas → today. One line each, notes under each slide. Close: "Now the same thing with real code."

### 20–70 · Demo (`/workshop-demo`)

| Min | Step | Do | Point |
| --- | --- | --- | --- |
| 20 | Code | `posts.ts`: server branch vs `/api/posts`, `isQuery: true`; registered in `server-registrations.ts` + `host-registrations.ts`. | Only code in the demo. Server loaders for `$q`, client loaders for canvas. |
| 25 | Card | Vertical stack `Card` → Text `POST #1`, Heading, body Text, **Link** `Read more`. Tokens only. | What they build at 80 min. Link element, never an `a` box. |
| 33 | Component | Right-click `Card` → **Create component** `PostCard`. Props `eyebrow`, `title`, `body` (text), `href` (link), defaults. Bind texts → `$props.x`. On page, change `title` on instance. | Props = typed controls. Always set defaults. |
| 40 | Variant | In `PostCard`: Variants → group `theme` → `dark`. Toggle on instance. | Same as a `choice` prop on a code component. Responsive override = variant too. |
| 46 | Data | Page root → Data queries → Custom function → **Get posts (demo)**, limit 6. Wrap instance in horizontal stack `Cards`. Instance → **Repeat element** → `$q.getPosts.data`. Bind `title` → `currentItem.title`, `body` → `currentItem.body`, `eyebrow` → `"POST #" + currentItem.id`, `theme: dark` → `currentIndex % 2 === 1`. | `$q` runs on the server, in the HTML. `currentItem` = `.map()`. Code components expose `$ctx` the same way. |
| 56 | Publish | **Publish**. Open live URL. View source → `POST #1` in HTML. | Project-wide snapshot, webhook purges tag, no deploy. |
| 63 | Preview | Limit → 3, no publish. Studio **Preview** → 3 cards; live still 6. | How branches get reviewed in session 2. |
| 67 | Q&A | Questions doc. Then teams. | |

### 70–80 · Teams and rules

| Team 1 — sections 1–5 | Team 2 — sections 6–10 |
| --- | --- |
| **Jose Perdomo** (lead) | **Jose Arriaga** (lead) |
| Jorge Siguenza | Carlos Escobar |
| Bradley Sanchez | Angella Falck |
| Leonardo Banegas | Guillermo Quintanilla |
| Natalia Robredo | Michael Sanchez |

| # | Section | Branch | Placeholder | Component | Figma | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inclusions copy | `feat/inclusions-copy` | INCLUSIONS COPY AND MODAL PLACEHOLDER | Studio layout, tokens | [3199-51041](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=3199-51041) | Bradley Sanchez |
| 2 | Inclusions modal | `feat/inclusions-modal` | same, modal part | ModalWrapper | none → Vacation Promise modal on live page | Leonardo Banegas |
| 3 | Accommodation slider | `feat/accommodation-slider` | ACCOMODATION SLIDER PLACEHOLDER | SliderCarousel | [6001-278363](https://www.figma.com/design/UHS1HaH7x3ivT0Hcr20PQZ/Design-System---Sliders-and-Galleries?node-id=6001-278363) | Natalia Robredo |
| 4 | Reviews slider | `feat/reviews-slider` | inside Reviews tab of 6 | SliderCarousel | [831-6626](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=831-6626) | Jose Perdomo |
| 5 | Awards slider | `feat/awards-slider` | inside Awards tab of 6 | SliderCarousel | [831-6626](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=831-6626) | Jorge Siguenza |
| 6 | Reviews / Awards tabs | `feat/reviews-awards-tabs` | REVIEWS AND AWARDS PLACEHOLDER | TabsContainer holding 4 + 5 | [831-6626](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=831-6626) + live tabs | Jose Arriaga |
| 7 | Flights table | `feat/flights-table` | FLIGHTS MODAL PLACEHOLDER (table) | Studio layout + CustomScrollbar; TabsContainer if several origins | [3013-25567](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=3013-25567) | Guillermo Quintanilla |
| 8 | Flights modal | `feat/flights-modal` | FLIGHTS MODAL PLACEHOLDER (modal) | ModalWrapper (+ FormContainer if inputs) | [8528-173151](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=8528-173151) | Angella Falck |
| 9 | FAQ | `feat/faq-accordion` | FAQ ACCORDION PLACEHOLDER | AccordionContainer | [3215-37000](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=3215-37000) | Michael Sanchez |
| 10 | Closer | `feat/closer` | Closer Section, below FAQ | Studio layout, tokens | [4103-52793](https://www.figma.com/design/dKPtpqoAbpWkiBaSJakdsw/Design-System---Styles---Buttons---Copy?node-id=4103-52793) | Carlos Escobar |

Say:

- One section each. Branches exist; switch from the dropdown, never create one, never edit `main`. Leads are the only ones who merge.
- Walk the Roatan page top to bottom, point at each placeholder, name the owner.
- Shared boxes: 1+2, 4+5+6, 7+8. Box owner replaces the placeholder with a stack + empty slot; the other builds their part as its own component on their branch; the lead wires them at merge. Tabs owner (6) drops both sliders into the tab contents.
- Rules: registered components only, tokens/presets only, one variant + one responsive override, Link element for navigation, update branch from `main` if it moves.
- Figma = look, royal-curacao = behaviour.

### 80–120 · Hands-on

Floor-walk every 10 min: on own branch? placeholder replaced? one code component? tokens only? preview works? Done at 120 when every branch previews. Nothing between sessions.

## Session 2

| Min | What |
| --- | --- |
| 0–45 | Finish on branches. At 30: "15 min to previewable." Check variant, responsive override, Link element. |
| 45–85 | Merge on screen. Perdomo merges 1–5 in order; Arriaga 6–10, with 6 after 4 and 5. One person per conflict; nobody edits that component meanwhile. Studio Preview of `main` after each merge. |
| 85–105 | Publish `main` once. Open live Roatan page: 10 sections. |
| 105–120 | Retro: slower / faster than Strapi flow, what blocked. Questions → doc for the Plasmic call. Share the deck. |

## Fallbacks

| Symptom | Do |
| --- | --- |
| Vercel host down | `yarn dev:https` → Studio project settings → App host `https://localhost:8080/plasmic-host`. Switch back after. |
| Query missing / canvas error | Reload Studio. `curl 'https://plasmic-workshop.vercel.app/api/posts?limit=1'`. |
| `currentItem` not in picker | Select the `PostCard` instance, not a child. |
| Old version live | Purge URL. |
| "Refresh code component props" modal | Confirm once. Not an error. |
| Studio slow | Close the Roatan arena during the demo. |
| Attendee can't run locally | Not needed; Studio + shared host is the workshop. |
