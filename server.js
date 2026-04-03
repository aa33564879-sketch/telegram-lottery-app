import express from "express";
import { createClient } from "@supabase/supabase-js";

console.log("🔥 SERVER STARTING...");

// ===== 初始化 =====
const app = express();
app.use(express.json());
app.use(express.static("public"));

// ===== Supabase =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== 健康检查 =====
app.get("/", (req, res) => {
  res.redirect("/wheel/?from=home");
});

// ===== 获取用户信息 =====
app.get("/api/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { bot_id } = req.query;

    if (!bot_id) {
      return res.json({ game_id: null });
    }

    const { data, error } = await supabase
      .from("users")
      .select("game_id")
      .eq("platform_user_id", id)
      .eq("bot_id", bot_id)
      .maybeSingle();

    if (error) {
      return res.json({ game_id: null });
    }

    return res.json({
      game_id: data?.game_id || null
    });

  } catch (err) {
    console.error("user api error:", err);
    res.json({ game_id: null });
  }
});

// ===== 抽奖接口 =====
app.post("/api/lottery", async (req, res) => {
  try {
    console.log("🎯 API HIT:", req.body);

    const { user_id, bot_id, activity_id } = req.body;

    if (!bot_id) {
      return res.json({ success: false, message: "no_bot" });
    }

    if (!user_id) {
      return res.json({ success: false, message: "no_user" });
    }

    if (!activity_id) {
      return res.json({ success: false, message: "no_activity" });
    }

    // ===== 获取 bot_token =====
    const { data: botRow, error: botError } = await supabase
      .from("bot_tokens")
      .select("token")
      .eq("bot_id", bot_id)
      .maybeSingle();

    if (botError || !botRow?.token) {
      console.error("❌ bot token error:", botError);
      return res.json({ success: false, message: "no_bot_token" });
    }

    const botToken = botRow.token;

    // ===== 查抽奖机会 =====
    const { data: lotteryData, error } = await supabase
  .from("lottery_users")
  .select("*")
  .eq("user_id", user_id.toString())
  .eq("bot_id", bot_id)
  .eq("used", false)
  .order("created_at", { ascending: false })
  .limit(1);

if (error) {
  console.error("❌ user query error:", error);
  return res.json({ success: false, message: "db_error" });
}

const row = lotteryData?.[0];  // ⭐ 关键

if (!row) {
  return res.json({ success: false, message: "no_chance" });
}

    // ===== 查 game_id =====
    const { data: userRow } = await supabase
      .from("users")
      .select("game_id")
      .eq("platform_user_id", user_id.toString())
      .eq("bot_id", bot_id)
      .maybeSingle();

    const gameId = userRow?.game_id;

    if (!gameId) {
      return res.json({ success: false, message: "no_game_id" });
    }

    // ===== 写参与记录 =====
    const { error: insertError } = await supabase
      .from("activity_participations")
      .insert({
        bot_id,
        activity_id,
        platform: "telegram",
        platform_user_id: user_id.toString(),
        game_id: gameId,
        status: "pending"
      });

    if (insertError) {
      console.error("❌ participation insert error:", insertError);
      return res.json({ success: false, message: "insert_error" });
    }

    // ===== 标记已用 =====
    const { data: updated } = await supabase
      .from("lottery_users")
      .update({ used: true })
      .eq("id", row.id) 
      .eq("used", false)
      .eq("bot_id", bot_id)
      .select()
      .maybeSingle();

    if (!updated) {
      return res.json({ success: false, message: "used" });
    }

    // ===== ✅ 返回结果（关键）=====
    res.json({
      success: true,
      reward: row.reward
    });

    // ===== 🔥 异步删除按钮 =====
    (async () => {
      try {

        // 👉 延迟一下（防卡顿）
        await new Promise(r => setTimeout(r, 1200));

        const { data: msg } = await supabase
          .from("lottery_message_states")
          .select("*")
          .eq("user_id", user_id.toString())
          .eq("bot_id", bot_id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!msg) return;

        // ===== 改按钮 =====
        if (msg.message_id) {
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user_id,
              message_id: msg.message_id,
              text: "✅ 抽奖已完成",
              reply_markup: { inline_keyboard: [] }
            })
          });
        }

        // ===== 更新状态 =====
        await supabase
          .from("lottery_message_states")
          .update({ status: "used" })
          .eq("id", msg.id);

      } catch (err) {
        console.error("❌ async button update error:", err);
      }
    })();

  } catch (err) {
    console.error("🔥 API CRASH:", err);
    return res.json({ success: false, message: "server_error" });
  }
});

// ===== 🚀 启动服务器（必须在外面）=====
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 server running on", PORT);
});