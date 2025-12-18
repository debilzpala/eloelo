import express from "express";
import cors from "cors";
import { status } from "minecraft-server-util";

const app = express();
app.use(cors());

const SERVER_HOST = "B6steak.aternos.me";
const SERVER_PORT = 13735;

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1450869365795979436/IVHLCVwVLPHmZ2wTEYC4zC5bJIDHA35LZG1lI8QzJ31H6bzUVzDDdP8AI4tBxcB-DNpP";

let cache = null;
let lastFetch = 0;
const CACHE_DURATION = 10000; // 10 sekund

// Funkcja wysyłająca powiadomienie do Discorda
async function sendDiscordWebhook(message) {
  if (!DISCORD_WEBHOOK) return;
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
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

  // Sprawdzenie, czy status się zmienił, żeby wysłać webhook
  if (!cache || cache.online !== newCache.online) {
    const statusText = newCache.online ? "ONLINE" : "OFFLINE";
    await sendDiscordWebhook(`Serwer Minecraft **${SERVER_HOST}** jest teraz **${statusText}**!`);
  }

  cache = newCache;
  lastFetch = now;

  res.json(cache);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API działa na porcie ${PORT}`));
