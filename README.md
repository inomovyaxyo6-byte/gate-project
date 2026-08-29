# GATE

GATE is a personal running log of movie frames (screenshots/stills) — a searchable, filterable gallery organized by movie, in the spirit of FilmGrab or Shot Cafe.

Live site: https://inomovyaxyo6-byte.github.io/gate-project/

The site is a single file, [index.html](index.html) — markup, styles, and logic together, no build step. Data lives in Supabase (Postgres + Storage), so the collection is the same on every device rather than tied to one browser.

## Features

- **Log frames** by pasting image URLs, uploading files, or pasting a screenshot straight from the clipboard (Ctrl/Cmd+V). Uploads are resized and compressed before being stored.
- **TMDB autofill** — look a title up to fill in year, director, genre, and top cast automatically.
- **Group by movie**, with a chosen cover photo, a blurred backdrop, and an ambient "mood tint" sampled from that movie's own stills.
- **Edit movie info** after the fact, and add more frames to an existing movie without retyping its details.
- **Soundtracks** — one track per movie (see below).
- **Browse by color** — every frame's dominant color grading is sampled and bucketed into hues, so frames can be browsed by mood across every movie at once.
- **Favorites** — any signed-in visitor can heart a still and get their own favorites view.
- **Search, sort, and filter** by title, director, genre, or notes; jump to a random frame.
- **Deep links** — opening a movie or a still updates the URL (`?movie=…&frame=…`), copyable via the 🔗 button.
- **Send to Telegram** — select stills and push them to a private Telegram chat as an album, ready to forward to a channel.
- **Multi-select** for deleting or sending several stills at once.
- **Stats** (owner only) — visit counts and most-visited movies.
- **Export / import** the whole collection as JSON.
- **Installable (PWA)** — add to a phone's home screen and it opens like a standalone app.

## Soundtracks

Three ways to attach the one track a movie plays while you browse its frames:

- **A YouTube link** — embeds the official player, so the track plays in full. This is an embed rather than an audio element on purpose: pulling the audio stream out of a video would mean copying the music, and YouTube's terms require the player stay visible, so it renders as a compact 16:9 frame. (Use `youtube.com/embed`, not `youtube-nocookie.com` — with cookies blocked YouTube shows a "confirm you're not a bot" wall instead of playing.)
- **Automatic lookup** via Apple's iTunes Search API — free, no key, and it returns Apple's official 30-second previews, so nothing is copied or re-hosted. Film titles alone match unrelated bands and cover versions, so the lookup pulls the composer and release year from TMDB and ranks albums by those; an album has to match the title or the composer to appear at all.
- **A direct audio URL or an uploaded file**, stored in Supabase Storage.

## Accounts and access

Anyone with the link can browse the gallery, and anyone can create an account to collect favorites — public sign-up is on.

Editing is a separate thing: only one specific account (matched by user id, in both the page and the Row Level Security policies) can add, edit, or remove frames, movies, and soundtracks, or read the visit stats. Being signed in is not enough.

## Telegram bot

[supabase/functions/telegram-bot/](supabase/functions/telegram-bot/) is a Supabase Edge Function serving two callers, told apart by how they authenticate:

- the **site**, with the owner's Supabase JWT — receives selected frames and sends them to a private chat as an album
- **Telegram's webhook**, with a shared secret — records channel posts, subscriber joins/leaves, and per-emoji reaction totals

See [SETUP.md](supabase/functions/telegram-bot/SETUP.md) for setup, including the two steps that silently break everything if missed, and what Telegram will not report to any bot (who viewed a post, who forwarded it, and who set a native reaction on a channel post — channel reactions are anonymous in Telegram itself).

## Storage

Metadata lives in Supabase Postgres; uploaded images and audio live in Supabase Storage. Everything is behind Row Level Security: reads are public, writes are limited to the owner account, and favorites are visible only to the visitor who made them.

Note that this project does not grant privileges on new tables automatically — every new table needs its `grant` statements spelled out for `anon`, `authenticated`, and `service_role`, or inserts fail with `42501 permission denied` while everything else looks correctly configured.

## Usage

Visit the live site above, or open [index.html](index.html) directly in a browser — it talks to the same Supabase project either way.
