import express from "express";
import cors from "cors";
import { status } from "minecraft-server-util";

const app = express();
app.use(cors());

const SERVER_HOST = "B6steak.aternos.me";
const SERVER_PORT = 13735;

const DISCORD_WEBHOOK = "TWÓJ_WEBHOOK_URL_HERE";

// Cache i stabilizacja statusu
let cache = null;
let lastFetch = 0;
const CACHE_DURATION = 10000; // 10 sekund

let lastOnlineStatus = null;   // ostatni faktyczny status wysłany do webhooka
let lastObservedStatus = null; // ostatni status odczytany z serwera
let consecutiveCount = 0;      
const REQUIRED_CONSECUTIVE = 2; // wymagana liczba kolejnych odczytów

// Funkcja wysyłająca embed do Discorda
async function sendDiscordEmbed(status, data) {
  if (!DISCORD_WEBHOOK) return;

  const embed = {
    title: `Serwer Minecraft ${SERVER_HOST} jest teraz ${status ? "ONLINE ✅" : "OFFLINE ❌"}`,
    color: status ? 3066993 : 15158332, // zielony/czerwony
    fields: [
      { name: "MOTD", value: data.motd || "Brak MOTD", inline: false },
      { name: "Gracze", value: `${data.onlinePlayers}/${data.maxPlayers}`, inline: true }
    ],
    timestamp: new Date()
  };

  if (data.icon) embed.thumbnail = { url: data.icon };

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (err) {
    console.error("Błąd przy wysyłaniu webhooka:", err);
  }
}

app.get("/api/status", async (req, res) => {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_DURATION) return res.json(cache);

  let newCache;
  try {
    const result = await status(SERVER_HOST, SERVER_PORT, { timeout: 5000 });
    newCache = {
      online: true,
      onlinePlayers: result.players.online,
      maxPlayers: result.players.max,
      motd: result.motd.clean || result.motd.raw || "Brak MOTD",
      icon: result.favicon || null
    };
  } catch {
    newCache = {
      online: false,
      onlinePlayers: 0,
      maxPlayers: 0,
      motd: "OFFLINE",
      icon: null
    };
  }

  // Stabilizacja statusu
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API działa na porcie ${PORT}`));
