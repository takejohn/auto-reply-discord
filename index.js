const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});

const TOKEN = fs.readFileSync(".token", "utf-8");

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(TOKEN);
