import fetch from "node-fetch";

const API_URL = "https://eloelo-production.up.railway.app/api/status?host=B6steak.aternos.me&port=13735";
const WEBHOOK_URL = "https://discord.com/api/webhooks/1450869365795979436/IVHLCVwVLPHmZ2wTEYC4zC5bJIDHA35LZG1lI8QzJ31H6bzUVzDDdP8AI4tBxcB-DNpP"; // <- WAZNE

let lastStatus = null;

async function checkStatus() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    let online = data.online === true;
    let motd = (data.motd || "").toLowerCase();

    // JESLI MOTD MA "offline" -> OFFLINE
    if (motd.includes("offline")) {
      online = false;
    }

    const currentStatus = online ? "ONLINE" : "OFFLINE";

    // wyslij webhook tylko przy zmianie
    if (lastStatus !== null && lastStatus !== currentStatus) {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "CheetosCraft Status",
          embeds: [
            {
              title: "Status serwera Minecraft",
              description: `Serwer **CheetosCraft** jest teraz **${currentStatus}**`,
              color: online ? 0x00ff00 : 0xff0000,
              footer: { text: "Automatyczny system statusu" },
              timestamp: new Date()
            }
          ]
        })
      });

      console.log("Webhook wyslany:", currentStatus);
    }

    lastStatus = currentStatus;
  } catch (err) {
    console.error("Blad sprawdzania statusu:", err);
  }
}

// START
console.log("CheetosCraft status webhook uruchomiony");
checkStatus();
setInterval(checkStatus, 5000); // co 5 sekund
