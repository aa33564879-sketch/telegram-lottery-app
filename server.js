const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// 静态文件
app.use(express.static("public"));

// ===== 验证 Telegram =====
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

// ===== 抽奖接口 =====
app.post("/api/lottery", (req, res) => {
  const { initData } = req.body;

  const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";

  const isValid = validateTelegramData(initData, BOT_TOKEN);

  if (!isValid) {
    return res.json({
      success: false,
      message: "invalid_user"
    });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  const reward = Math.random() < 0.5 ? 100 : 0;

  res.json({
    success: true,
    reward,
    user_id: user.id
  });
});

// ===== 启动 =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});