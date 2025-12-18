import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.WEBHOOK_URL;

// cache statusu (żeby webhook nie spamował)
let lastOnline = null;

async function getMCStatus(host, port){
  const url = `https://api.mcstatus.io/v2/status/java/${host}:${port}`;
  const res = await fetch(url);
  const json = await res.json();

  const motd =
    json.motd?.clean?.join("\n") ||
    json.motd?.raw?.join("\n") ||
    "Brak MOTD";

  const icon = json.icon || null;

  const online =
    json.online === true &&
    !motd.toLowerCase().includes("offline");

  return {
    online,
    onlinePlayers: json.players?.online ?? 0,
    maxPlayers: json.players?.max ?? 0,
    motd,
    icon
  };
}

async function sendWebhook(online){
  if(!WEBHOOK) return;

  const content = online
    ? "🟢 **CheatosCraft jest ONLINE!**"
    : "🔴 **CheatosCraft jest OFFLINE!**";

  await fetch(WEBHOOK,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ content })
  });
}

// endpoint API
app.get("/api/status", async (req,res)=>{
  const { host, port } = req.query;
  if(!host || !port){
    return res.status(400).json({ error:"Brak host/port" });
  }

  try{
    const data = await getMCStatus(host,port);

    // webhook tylko gdy zmiana
    if(lastOnline !== null && lastOnline !== data.online){
      await sendWebhook(data.online);
    }
    lastOnline = data.online;

    res.json(data);
  }catch(e){
    console.error(e);
    res.json({
      online:false,
      onlinePlayers:0,
      maxPlayers:0,
      motd:"Blad API",
      icon:null
    });
  }
});

app.get("/",(_,res)=>res.send("API dziala"));

app.listen(PORT,()=>{
  console.log("API running on port",PORT);
});
