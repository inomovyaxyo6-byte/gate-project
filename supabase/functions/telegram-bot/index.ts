// Telegram webhook receiver for the GATE channel.
//
// Telegram is deliberately restrictive about channel analytics, so this
// records everything a bot admin is actually allowed to see:
//   - message_reaction        -> who reacted, with which emoji, on which post
//   - message_reaction_count  -> per-emoji totals when reactions are anonymous
//   - chat_member             -> who joined / left / was removed
//   - channel_post            -> new posts, so reaction rows can be tied to them
//   - edited_channel_post     -> keeps the stored preview in sync
//   - callback_query          -> who tapped the bot's own ❤️ button, BY NAME
//
// Channels deliver reactions *anonymously*, so in practice channel posts produce
// message_reaction_count (counts only) and never message_reaction (which carries
// a name). The named handler is kept because groups do send it.
//
// That anonymity is why the bot posts its own inline ❤️ button under each
// publication: tapping an inline button produces a callback_query, and that one
// *does* carry the user's identity. It's the only way to learn who engaged with
// a channel post.
//
// What Telegram never exposes to any bot (no workaround exists): the list of
// users who *viewed* a post (only an aggregate count, and only via the app's
// own statistics), and who forwarded a post or where they forwarded it to.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const SITE_URL = "https://inomovyaxyo6-byte.github.io/gate-project/";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function tg(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

// The ❤️ carries callback_data so taps are attributable; the site link is a
// plain url button (url buttons produce no callback, so they tell us nothing —
// that's fine, it's just navigation).
function likeKeyboard(targetMessageId: number, count: number) {
  return {
    inline_keyboard: [[
      { text: count > 0 ? `❤️ ${count}` : "❤️", callback_data: `like:${targetMessageId}` },
      { text: "🖼 Все кадры", url: SITE_URL },
    ]],
  };
}

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

    if (update.message_reaction_count) {
      const rc = update.message_reaction_count;
      const rows = (rc.reactions ?? [])
        .map((entry: Record<string, any>) => {
          const t = entry.type ?? {};
          const emoji = t.type === "emoji" ? t.emoji : t.type === "custom_emoji" ? "custom" : t.type;
          if (!emoji) return null;
          return {
            chat_id: rc.chat?.id,
            message_id: rc.message_id,
            emoji,
            total_count: entry.total_count ?? 0,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (rows.length) {
        await supabase
          .from("tg_reaction_counts")
          .upsert(rows, { onConflict: "chat_id,message_id,emoji" });
      }
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

    // The bot used to auto-post a ❤️ button under every publication, since a
    // button tap is the only channel event that identifies the user. It was
    // removed: an album can't carry an inline keyboard, so the button had to be
    // its own message under each post, and that visual noise wasn't worth the
    // names. Channel engagement therefore stays anonymous (tg_reaction_counts).
    //
    // The handler below is kept so any buttons already posted still respond
    // instead of leaving a spinner on the tapper's screen.

    // Someone tapped a ❤️ — this is the one channel event that identifies them.
    if (update.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data ?? "";

      if (data.startsWith("like:")) {
        const targetId = Number(data.slice(5));
        const chatId = cq.message?.chat?.id;
        const userId = cq.from?.id;

        const { data: existing } = await supabase.from("tg_likes")
          .select("user_id")
          .eq("chat_id", chatId)
          .eq("message_id", targetId)
          .eq("user_id", userId)
          .maybeSingle();

        let liked: boolean;
        if (existing) {
          await supabase.from("tg_likes").delete()
            .eq("chat_id", chatId)
            .eq("message_id", targetId)
            .eq("user_id", userId);
          liked = false;
        } else {
          await supabase.from("tg_likes").insert({
            chat_id: chatId,
            message_id: targetId,
            user_id: userId,
            username: cq.from?.username ?? null,
            full_name: fullName(cq.from),
          });
          liked = true;
        }

        const { count } = await supabase.from("tg_likes")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chatId)
          .eq("message_id", targetId);

        await tg("editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: cq.message?.message_id,
          reply_markup: likeKeyboard(targetId, count ?? 0),
        });
        // Always answer, or the tapper sees a spinner until it times out.
        await tg("answerCallbackQuery", {
          callback_query_id: cq.id,
          text: liked ? "❤️" : "Лайк снят",
        });
      } else {
        await tg("answerCallbackQuery", { callback_query_id: cq.id });
      }
    }
  } catch (err) {
    // Never fail the webhook — Telegram retries on non-200 and would loop.
    console.error("handler error", err);
  }

  return new Response("ok");
});
