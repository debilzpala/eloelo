const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

/* === DISCORD WEBHOOK URL === */
const WEBHOOK_URL = "TU_WKLEJ_WEBHOOK_DISCORDA";

/* === PAMIEC POPRZEDNIEGO STATUSU === */
let lastOnlineState = null;

/* === ROOT (WAZNE DLA RAILWAY) === */
app.get("/", (req, res) => {
  res.send("CheatosCraft API works");
});

/* === STATUS API === */
app.get("/api/status", async (req, res) => {
  const host = req.query.host;
  const port = req.query.port || 25565;

  try {
    const r = await fetch(
      `https://api.mcstatus.io/v2/status/java/${host}:${port}`
    );
    const d = await r.json();

    const motd = d.motd?.clean || "Brak MOTD";
    const isOfflineMotd = motd.toLowerCase().includes("offline");

    const online = d.online && !isOfflineMotd;

    /* === WEBHOOK TYLKO PRZY ZMIANIE === */
    if (lastOnlineState !== null && lastOnlineState !== online) {
      sendWebhook(online, host, port);
    }
    lastOnlineState = online;

    res.json({
      online,
      onlinePlayers: d.players?.online || 0,
      maxPlayers: d.players?.max || 0,
      motd,
      icon: d.icon || ""
    });

  } catch (e) {
    if (lastOnlineState !== false) {
      sendWebhook(false, host, port);
      lastOnlineState = false;
    }

    res.json({
      online: false,
      onlinePlayers: 0,
      maxPlayers: 0,
      motd: "Brak MOTD",
      icon: ""
    });
  }
});

/* === FUNKCJA WEBHOOK === */
async function sendWebhook(online, host, port) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("TU_WKLEJ")) return;

  const payload = {
    username: "CheatosCraft Monitor",
    embeds: [
      {
        title: online ? "🟢 SERVER ONLINE" : "🔴 SERVER OFFLINE",
        description: `**${host}:${port}**`,
        color: online ? 5763719 : 15548997,
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.log("Webhook error");
  }
}

/* === START === */
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
