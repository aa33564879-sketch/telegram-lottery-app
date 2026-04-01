
// ===== 奖池 =====
const rewards = [
  "18K","28K","38K","58K",
  "88K","188K","388K","588K"
];

let spinning = false;
let currentDeg = 0;

// ===== 创建转盘 =====
function createWheel() {
  const modal = document.createElement("div");
  modal.id = "wheelModal";

  modal.innerHTML = `
    <div class="wheel-box">
      <div class="close-btn" id="closeWheel">✖</div>
      <div class="pointer">▼</div>
      <canvas id="wheelCanvas" width="260" height="260"></canvas>
      <div id="wheelResult"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById("closeWheel");

  // ✅ 初始可关闭
  closeBtn.style.opacity = "1";
  closeBtn.style.pointerEvents = "auto";

  closeBtn.onclick = () => {
    document.getElementById("wheelModal").style.display = "none";
  };

  drawWheel();
}

// ===== 绘制转盘 =====
function drawWheel() {
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");

  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;

  const arc = (2 * Math.PI) / rewards.length;

  // ===== 外圈灯 =====
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const x = center + Math.cos(angle) * (radius + 10);
    const y = center + Math.sin(angle) * (radius + 10);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ===== 扇形（关键：从顶部开始）=====
  rewards.forEach((text, i) => {
    const angle = i * arc - Math.PI / 2; // ✅ 修正起点（顶部）

    ctx.beginPath();
    ctx.moveTo(center, center);

    ctx.fillStyle = i % 2 ? "#0d0d0d" : "#000";
    ctx.arc(center, center, radius, angle, angle + arc);
    ctx.fill();

    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ===== 文字 =====
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle + arc / 2);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";

    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 8;

    ctx.fillText(text, radius - 50, 5);

    ctx.restore();
  });

  // ===== 中心圆 =====
  const grd = ctx.createRadialGradient(center, center, 5, center, center, 40);
  grd.addColorStop(0, "#fff5cc");
  grd.addColorStop(1, "#ffd700");

  ctx.beginPath();
  ctx.arc(center, center, 35, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
}

// ===== 打开转盘 =====
function openWheel() {
  document.getElementById("wheelModal").style.display = "flex";
}

// ===== 旋转（最终精准版）=====
function spinWheel(rewardText) {
  const index = rewards.indexOf(rewardText);

  if (index === -1) {
    console.error("奖励不存在:", rewardText);
    return Promise.resolve();
  }

  const perDeg = 360 / rewards.length;

  // ✅ 扇区中心（必须用中心）
  const targetDeg = index * perDeg + perDeg / 2;

  // ✅ 每次都重新算（不要累加）
  currentDeg = 360 * 5 + (360 - targetDeg);

  const canvas = document.getElementById("wheelCanvas");

  canvas.style.transition = "transform 4s cubic-bezier(0.25,1,0.5,1)";
  canvas.style.transform = `rotate(${currentDeg}deg)`;

  return new Promise(resolve => setTimeout(resolve, 4000));
}

// ===== 抽奖 =====
const params = new URLSearchParams(window.location.search);

const botId = params.get("bot_id");
const activityId = params.get("activity_id");

  async function startWheelLottery(userId) {
  if (spinning) return;

  spinning = true;

  const closeBtn = document.getElementById("closeWheel");

  // 🔒 锁定关闭按钮
  closeBtn.style.opacity = "0.5";
  closeBtn.style.pointerEvents = "none";

  const resultEl = document.getElementById("wheelResult");
  resultEl.innerText = "⏳ Đang quay thưởng...";

  try {
    const res = await fetch("https://g168code.site/api/lottery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user_id: userId, bot_id: botId, activity_id: activityId  })
    });

    const data = await res.json();

    // ❌ 失败情况
    if (!data.success) {
      if (data.message === "used") {
        showErrorModal("⭐ Vào bot nhập CODE để quay thưởng ⭐");
      } else {
        showErrorModal("Mã CODE sai");
      }

      // 🔓 解锁按钮（关键）
      closeBtn.style.opacity = "1";
      closeBtn.style.pointerEvents = "auto";

      spinning = false;
      return;
    }

    const rewardFull = data.reward;
    const rewardK = rewardFull / 1000;

    await spinWheel(rewardK + "K");

    // 🔓 恢复按钮
    closeBtn.style.opacity = "1";
    closeBtn.style.pointerEvents = "auto";

    resultEl.innerText = "🎉 Bạn đã trúng：" + rewardFull;

    // 弹中奖弹窗
    setTimeout(() => {
      showRewardModal(data.reward);
    }, 500);

  } catch (err) {
    resultEl.innerText = "❌ Lỗi mạng";

    // 🔓 解锁按钮（必须）
    closeBtn.style.opacity = "1";
    closeBtn.style.pointerEvents = "auto";
  }

  spinning = false;
}

// ===== 错误提示弹窗 =====
function showErrorModal(msg) {
  let modal = document.getElementById("errorModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "errorModal";

    modal.innerHTML = `
      <div class="error-mask" onclick="closeErrorModal()">
        <div class="error-box" onclick="event.stopPropagation()">
       <div class="error-close" onclick="closeErrorModal()">✖</div>
          <div class="error-icon">❌</div>
          <div class="error-text">${msg}</div>
          <button class="modal-btn" onclick="goBot(); closeErrorModal()">Nhập CODE</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  modal.querySelector(".error-text").innerText = msg;
  modal.style.display = "block";
}

function closeErrorModal() {
  const modal = document.getElementById("errorModal");
  if (modal) modal.style.display = "none";
}

// ===== 中奖弹窗 =====
function showRewardModal(reward) {
  let modal = document.getElementById("rewardModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "rewardModal";

    modal.innerHTML = `
      <div class="reward-mask">
        <div class="reward-box">

          <div class="reward-title">🎉 Bạn đã trúng</div>

          <div class="reward-amount">${reward}</div>

          <div class="reward-desc">
            Đang chờ duyệt<br/>
            ⭐ Vui lòng theo dõi tin nhắn từ bot ⭐
          </div>

          <button class="modal-btn">Xác nhận</button>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 关闭按钮
    modal.querySelector(".modal-btn").onclick = () => {
  modal.style.display = "none";
};
  }

  // 更新金额
  modal.querySelector(".reward-amount").innerText = reward;

  modal.style.display = "block";
}

// ===== 页面加载时校验 =====
window.onload = async () => {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  // ❌ 没用户 → 不创建转盘（页面就是普通落地页）
  if (!user) {
    console.log("❌ 非抽奖入口，不创建转盘");
    return;
  }

  const userId = user.id;

  console.log("✅ 合法用户，创建转盘");

  // 🔥 关键：这里才创建
  createWheel();
  // 🔥 再打开
  openWheel();
  // 🔥 再抽奖
  startWheelLottery(userId);
};

function goBot() {
  const botLink = "https://t.me/g168vnbot";  // 👈 改成你的机器人

  if (window.Telegram?.WebApp) {
    Telegram.WebApp.openTelegramLink(botLink);
  } else {
    window.open(botLink);
  }
}