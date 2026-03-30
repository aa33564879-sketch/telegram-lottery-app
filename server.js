const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

/* =========================
   🎰 抽奖接口（接机器人）
========================= */
app.post("/api/lottery", (req, res) => {
  const { token } = req.body;

  // ❌ 没 token（非法进入）
  if (!token) {
    return res.json({
      success: false,
      message: "no_token"
    });
  }

  // =====================================
  // 👉 这里未来接你的机器人系统
  // =====================================
  // 现在先写死测试数据

  const fakeDB = {
    "abc123": { reward: "88K", used: false },
    "test888": { reward: "188K", used: false }
  };

  const data = fakeDB[token];

  // ❌ token不存在
  if (!data) {
    return res.json({
      success: false,
      message: "invalid"
    });
  }

  // ❌ 已使用
  if (data.used) {
    return res.json({
      success: false,
      message: "used"
    });
  }

  // 👉 标记已用（真实要写数据库）
  data.used = true;

  // ✅ 返回中奖结果（机器人已经决定）
  return res.json({
    success: true,
    reward: data.reward
  });
});

/* =========================
   🚀 启动服务
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});