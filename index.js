// index.js
import express from "express";
import cors from "cors";
import { status } from "minecraft-server-util";

const app = express();
app.use(cors());

// Konfiguracja serwera Minecraft
const SERVER_HOST = "B6steak.aternos.me";
const SERVER_PORT = 13735;

// Cache
let cache = null;
let lastFetch = 0;
const CACHE_DURATION = 10000; // 10 sekund

app.get("/api/status", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < CACHE_DURATION) {
    return res.json(cache);
  }

  try {
    const result = await status(SERVER_HOST, SERVER_PORT, { timeout: 5000 });

    cache = {
      online: true,
      onlinePlayers: result.players.online,
      maxPlayers: result.players.max,
      motd: result.motd.clean || result.motd.raw || "Brak MOTD",
      icon: result.favicon || null,
    };
    lastFetch = now;

    res.json(cache);
  } catch (e) {
    cache = {
      online: false,
      onlinePlayers: 0,
      maxPlayers: 0,
      motd: "OFFLINE",
      icon: null,
    };
    lastFetch = now;
    res.json(cache);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API działa na porcie ${PORT}`));
