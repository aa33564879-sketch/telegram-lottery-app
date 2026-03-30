import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/api/lottery", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.json({ success: false });
  }

  const { data, error } = await supabase
    .from("lottery_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error) {
    console.error("❌ token query error:", error);
  }

  if (!data) {
    return res.json({ success: false, message: "invalid" });
  }

  if (data.used) {
    return res.json({ success: false, message: "used" });
  }

  await supabase
    .from("lottery_tokens")
    .update({ used: true })
    .eq("token", token);

  return res.json({
    success: true,
    reward: data.reward
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});