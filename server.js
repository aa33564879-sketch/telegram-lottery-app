import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

// 👉 静态页面（WebApp）
app.use(express.static("public"));

/* ================================
   🔐 验证 Telegram initData（核心）
================================ */
function validateTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch {
    return false;
  }
}

/* ================================
   🎰 抽奖接口
================================ */
app.post("/api/lottery", async (req, res) => {
  const { initData } = req.body;

  // 👉 这里填你的 Bot Token
  const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";

  // ❗ 校验 Telegram 身份
  const isValid = validateTelegramData(initData, BOT_TOKEN);

  if (!isValid) {
    return res.json({
      success: false,
      message: "invalid_user"
    });
  }

  // 👉 解析用户
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  const userId = user.id;

  // =====================
  // 🎯 抽奖逻辑（先写简单版）
  // =====================

  const reward = Math.random() < 0.5 ? 100 : 0;

  return res.json({
    success: true,
    reward,
    user_id: userId
  });
});

/* ================================
   🚀 启动服务
================================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});