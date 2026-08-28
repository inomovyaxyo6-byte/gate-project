# Telegram channel analytics bot — setup

Records what a bot admin is allowed to see about the channel: reactions
(who reacted, with what), joins/leaves, and posts. Data lands in the same
Supabase project as the rest of GATE and is readable only by the owner account.

## 1. Create the bot

1. In Telegram, message **@BotFather** → `/newbot` → pick a name and username.
2. Copy the token it gives you (`1234567890:AAF...`). Keep it private — treat it
   like a password. It never needs to leave this setup.
3. Add the bot to your channel as an **admin**. Without admin rights it receives
   no reaction or member events at all.

## 2. Run the SQL

Run `gate_telegram_setup.sql` in Supabase → SQL Editor. It creates
`tg_reactions`, `tg_members`, and `tg_posts`, with owner-only read access.

## 3. Deploy the function

Supabase Dashboard → **Edge Functions** → *Deploy a new function* → *Via Editor*,
paste the contents of `index.ts`, deploy. The function name doesn't matter as
long as the webhook URL in step 4 matches it — this project's is deployed as
`smooth-processor` (Supabase's auto-generated default name).

Then open the function → **Settings** → turn **Verify JWT off**. This is
required: Telegram sends no `Authorization` header, so with JWT verification on
every webhook call is rejected with `401` before the code ever runs.

Then, in **Edge Functions → Secrets** (or Project Settings → Edge Functions),
add:

| Secret | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | any random string you invent (e.g. 20 random characters) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

## 4. Point Telegram at the function

**This is the step people usually get wrong:** reaction and member updates are
*opt-in*. If `allowed_updates` is omitted, Telegram silently never sends them
and the tables stay empty forever.

Replace `<TOKEN>` and `<SECRET>`, then run it (or just open the URL in a
browser — `setWebhook` is a plain GET):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://aygykkkqepqaqebprcuj.supabase.co/functions/v1/smooth-processor&secret_token=<SECRET>&allowed_updates=%5B%22message_reaction%22%2C%22message_reaction_count%22%2C%22chat_member%22%2C%22my_chat_member%22%2C%22channel_post%22%2C%22edited_channel_post%22%5D"
```

Check it took effect:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`allowed_updates` in the response should list the six update types above.

## What you get — and what Telegram will not give any bot

Available:

- **Reactions** — who reacted, which emoji, on which post (`tg_reactions`)
- **Joins / leaves** — who subscribed or left, and when (`tg_members`)
- **Posts** — every channel post the bot sees (`tg_posts`)

Not available to bots, by design, with no workaround:

- **Who viewed a post.** Only an aggregate view count exists, and only in
  Telegram's own channel statistics (which needs ~500+ subscribers to unlock).
- **Who forwarded a post, and where.** Forwarding is private to the forwarder.
- **Visitors who opened the channel without subscribing.**

So: exact names for reactions and subscriptions, numbers only for views.
