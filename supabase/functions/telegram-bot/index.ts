// Telegram webhook receiver for the GATE channel.
//
// Telegram is deliberately restrictive about channel analytics, so this
// records everything a bot admin is actually allowed to see:
//   - message_reaction        -> who reacted, with which emoji, on which post
//   - chat_member             -> who joined / left / was removed
//   - channel_post            -> new posts, so reaction rows can be tied to them
//   - edited_channel_post     -> keeps the stored preview in sync
//
// What Telegram never exposes to any bot (no workaround exists): the list of
// users who *viewed* a post (only an aggregate count, and only via the app's
// own statistics), and who forwarded a post or where they forwarded it to.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function fullName(user: Record<string, unknown> | undefined): string | null {
  if (!user) return null;
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function reactionEmoji(list: Array<Record<string, string>> | undefined): string | null {
  if (!list || !list.length) return null;
  return list
    .map((r) => (r.type === "emoji" ? r.emoji : r.type === "custom_emoji" ? "custom" : r.type))
    .filter(Boolean)
    .join(" ");
}

Deno.serve(async (req) => {
  // Telegram echoes back the secret we set when registering the webhook, so
  // random callers can't spam fake events into the tables.
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  let update: Record<string, any>;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    if (update.message_reaction) {
      const r = update.message_reaction;
      await supabase.from("tg_reactions").insert({
        chat_id: r.chat?.id,
        message_id: r.message_id,
        user_id: r.user?.id ?? null,
        username: r.user?.username ?? null,
        full_name: fullName(r.user),
        old_emoji: reactionEmoji(r.old_reaction),
        new_emoji: reactionEmoji(r.new_reaction),
      });
    }

    if (update.chat_member || update.my_chat_member) {
      const m = update.chat_member ?? update.my_chat_member;
      await supabase.from("tg_members").insert({
        chat_id: m.chat?.id,
        user_id: m.new_chat_member?.user?.id ?? m.from?.id ?? null,
        username: m.new_chat_member?.user?.username ?? m.from?.username ?? null,
        full_name: fullName(m.new_chat_member?.user ?? m.from),
        old_status: m.old_chat_member?.status ?? null,
        new_status: m.new_chat_member?.status ?? null,
      });
    }

    const post = update.channel_post ?? update.edited_channel_post;
    if (post) {
      const text: string = post.caption ?? post.text ?? "";
      await supabase.from("tg_posts").upsert({
        chat_id: post.chat?.id,
        message_id: post.message_id,
        text_preview: text.slice(0, 300) || null,
        views: null,
        forwards: null,
      });
    }
  } catch (err) {
    // Never fail the webhook — Telegram retries on non-200 and would loop.
    console.error("handler error", err);
  }

  return new Response("ok");
});
