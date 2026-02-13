import express from "express";
import cors from "cors";
import { status } from "minecraft-server-util";

const app = express();

// ================== KONFIGURACJA ==================
const SERVER_HOST = "pizzamc.work.gd";
const SERVER_PORT = 4009;

const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || null;

// ================== CORS ==================
app.use(cors()); // pełny CORS, każdy może używać API

// ================== CACHE ==================
let cache = null;
let lastFetch = 0;
const CACHE_DURATION = 10_000; // 10 sekund

// ================== STABILIZACJA ==================
let lastOnlineStatus = null;
let lastObservedStatus = null;
let consecutiveCount = 0;
const REQUIRED_CONSECUTIVE = 2;

// ================== DISCORD ==================
async function sendDiscordEmbed(isOnline, data) {
  if (!DISCORD_WEBHOOK) return;

  const embed = {
    title: `Serwer Cheatoscraft jest teraz ${
      isOnline ? "ONLINE ✅" : "OFFLINE ❌"
    }`,
    color: isOnline ? 3066993 : 15158332,
    fields: [
      { name: "MOTD", value: data.motd || "Brak MOTD" },
      { name: "Gracze", value: `${data.onlinePlayers}/${data.maxPlayers}`, inline: true }
    ],
    timestamp: new Date().toISOString()
  };

  if (data.icon) embed.thumbnail = { url: data.icon };

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
}

// ================== API ==================
app.get("/api/status", async (req, res) => {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_DURATION) return res.json(cache);

  let newCache;

  try {
    // zwiększony timeout do 15s, żeby serwery Aternos się zdążyły odpalić
    const result = await status(SERVER_HOST, SERVER_PORT, { timeout: 15000 });

    const motd =
      Array.isArray(result.motd.clean)
        ? result.motd.clean.join("\n")
        : result.motd.clean || result.motd.raw || "Brak MOTD";

    newCache = {
      online: true,
      onlinePlayers: result.players.online,
      maxPlayers: result.players.max,
      motd,
      icon: result.favicon || null
    };
  } catch (err) {
    // jeśli serwer nie odpowiada, zostaw poprzedni cache jeśli istnieje
    if (cache) {
      newCache = { ...cache, online: false }; // offline tymczasowo
    } else {
      newCache = {
        online: false,
        onlinePlayers: 0,
        maxPlayers: 0,
        motd: "OFFLINE",
        icon: null
      };
    }
  }

  // ===== STABILIZACJA =====
  if (lastObservedStatus === newCache.online) {
    consecutiveCount++;
  } else {
    lastObservedStatus = newCache.online;
    consecutiveCount = 1;
  }

  if (consecutiveCount >= REQUIRED_CONSECUTIVE && lastOnlineStatus !== newCache.online) {
    lastOnlineStatus = newCache.online;
    await sendDiscordEmbed(newCache.online, newCache);
  }

  cache = newCache;
  lastFetch = now;

  res.json(cache);
});

// ================== HEALTHCHECK ==================
app.get("/", (req, res) => res.send("OK"));

// ================== START ==================
app.listen(PORT, () => console.log(`✅ Minecraft API działa na porcie ${PORT}`));
