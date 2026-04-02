import express from "express";
import { createClient } from "@supabase/supabase-js";

console.log("🔥 SERVER STARTING...");

// ===== 环境变量检查 =====
if (!process.env.SUPABASE_URL) {
  console.error("❌ SUPABASE_URL missing");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing");
}

// ===== 初始化 =====
const app = express();
app.use(express.json());
app.use(express.static("public"));

// ===== Supabase =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== 健康检查（非常重要）=====
app.get("/", (req, res) => {
  res.redirect("/wheel/?from=home");
});

// ===== 获取用户信息（🔥 新增）=====
app.get("/api/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { bot_id } = req.query; 
    if (!bot_id) {
  return res.json({ game_id: null });
}  // 🔥 新增

    const { data, error } = await supabase
      .from("users")
      .select("game_id")
      .eq("platform_user_id", id)
      .eq("bot_id", bot_id)   // 🔥 动态
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

    // 1️⃣ 查用户
    const { data, error } = await supabase
  .from("lottery_users")
  .select("*")
  .eq("user_id", user_id)
  .eq("bot_id", bot_id)
  .eq("used", false)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

    if (error) {
      console.error("❌ user query error:", error);
      return res.json({ success: false, message: "db_error" });
    }

    if (!data) {
  return res.json({ success: false, message: "no_chance" });
}
   
// ===== 🔥 新增：查询 game_id =====
const { data: userRow, error: userError } = await supabase
  .from("users")
  .select("game_id")
  .eq("platform_user_id", user_id.toString())
  .eq("bot_id", bot_id)
  .maybeSingle();

if (userError) {
  console.error("❌ user query error:", userError);
}

const gameId = userRow?.game_id || null;

if (!gameId) {
  return res.json({
    success: false,
    message: "no_game_id"
  });
}

    console.log("🎉 reward:", data.reward);

   const { error: insertError } = await supabase
  .from("activity_participations")
  .insert({
    bot_id,
    activity_id,
    platform: "telegram",
    platform_user_id: user_id,
    game_id: gameId,
    status: "pending"
  });

if (insertError) {
  console.error("❌ participation insert error:", insertError);
  return res.json({ success: false, message: "insert_error" });
}

// 3️⃣ 标记已用
    const { data: updated, error: updateError } = await supabase
  .from("lottery_users")
  .update({ used: true })
  .eq("id", data.id)
  .eq("used", false)
  .eq("bot_id", bot_id)
  .select()
  .maybeSingle();

  if (!updated) {
  return res.json({ success: false, message: "used" });
}

    // 4️⃣ 返回结果
    return res.json({
      success: true,
      reward: data.reward
    });

  } catch (err) {
    console.error("🔥 API CRASH:", err);
    return res.json({ success: false, message: "server_error" });
  }
});

// ===== 启动 =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 server running on", PORT);
});