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

// ===== 抽奖接口 =====
app.post("/api/lottery", async (req, res) => {
  try {
    console.log("🎯 API HIT:", req.body);

    const { user_id } = req.body;

    if (!user_id) {
      return res.json({ success: false, message: "no_user" });
    }

    // 1️⃣ 查用户
    const { data, error } = await supabase
      .from("lottery_users")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error) {
      console.error("❌ user query error:", error);
      return res.json({ success: false, message: "db_error" });
    }

    if (!data) {
      console.log("❌ user not found");
      return res.json({ success: false, message: "invalid" });
    }

    // 2️⃣ 防重复
    if (data.used) {
      console.log("⚠️ already used");
      return res.json({ success: false, message: "used" });
    }

    // 3️⃣ 标记已用
    const { error: updateError } = await supabase
      .from("lottery_users")
      .update({ used: true })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("❌ update error:", updateError);
      return res.json({ success: false, message: "update_error" });
    }

    console.log("🎉 reward:", data.reward);

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