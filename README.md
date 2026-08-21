# GATE

GATE is a personal running log of movie frames (screenshots/stills) — a searchable, filterable gallery organized by movie, in the spirit of FilmGrab or Shot Cafe.

Live site: https://inomovyaxyo6-byte.github.io/gate-project/

Everything lives in a single file, [index.html](index.html) — markup, styles, and logic together, no build step. Data lives in Supabase (Postgres + Storage), so the collection is shared across every device and browser instead of being tied to one machine.

## Features

- **Log frames** by pasting image URLs, uploading files, or pasting a screenshot straight from the clipboard (Ctrl/Cmd+V). Uploads are auto-resized and compressed before being stored.
- **TMDB autofill** — look a title up on themoviedb.org to fill in year, director, genre, and top cast automatically.
- **Group by movie**, with a chosen cover photo per movie and an ambient color-graded "mood tint" sampled from that movie's own stills.
- **Edit movie info** after the fact (title/year/director/genre/actors), and add more frames to an existing movie without retyping its details.
- **Browse by color** — every frame's dominant color grading is sampled and bucketed into hues, so you can browse frames by mood/color across every movie at once, not just by title.
- **Search, sort, and filter** by title, director, genre, or notes; jump to a random frame.
- **Deep links** — opening a movie or a specific still updates the URL (`?movie=...&frame=...`), so a link can be copied (via the 🔗 button) and shared straight to that spot.
- **Multi-select delete** for clearing out several stills at once, alongside single-still removal.
- **Export / import** the whole collection as JSON.
- **Installable (PWA)** — add it to a phone's home screen and it opens like a standalone app, with its own icon.

## Access

Anyone with the link can browse the gallery. Adding, editing, or removing frames requires signing in with the owner's Supabase account (email/password). Public sign-up is disabled on the Supabase project, so only that one pre-created account can ever unlock editing.

## Storage

Frame and cover metadata live in Supabase Postgres tables; uploaded images live in Supabase Storage. Both are protected by Row Level Security: anyone can read, but only the signed-in owner can write.

## Usage

Visit the live site above, or open [index.html](index.html) directly in a browser — it talks to the same Supabase project either way.
