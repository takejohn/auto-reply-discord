const { Client, GatewayIntentBits, REST } = require("discord.js");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const SlashCommand = require("./classes/SlashCommand");
const DatabaseUtil = require("./classes/DatabaseUtil");
const CommandAddReply = require("./classes/commands/CommandAddReply");
const CommandRemoveReply = require("./classes/commands/CommandRemoveReply");

/* resources フォルダ内のファイルを data フォルダにコピーする */
const resourceNewlyCreated = function() {
    const resourceFileNames = fs.readdirSync("./resources");
    let result = false;
    fs.mkdirSync("./data", {
        recursive: true
    });
    for (const resourceFileName of resourceFileNames) {
        try {
            fs.copyFileSync(`./resources/${resourceFileName}`, `./data/${resourceFileName}`, fs.constants.COPYFILE_EXCL);
            result = true;
        } catch (e) {
            // data フォルダにファイルが存在するので何もしない
        }
    }
    return result;
}();

const database = new sqlite3.Database("./data/auto-reply.db");

(async function() {
    await DatabaseUtil.runSqlAsync(database, "PRAGMA foreign_keys = true;");
    await DatabaseUtil.runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_contents(
        reply_id char(36),
        guild_id char(20),
        content text
    );`);
    await DatabaseUtil.runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_keywords(
        keyword text,
        reply_id char(36),
        primary key (keyword, reply_id)
    );`);
})();

if (!resourceNewlyCreated) {
    const client = new Client({
        intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
    });

    /**
     * @type {{token: string, guild_ids: string[]}}
     */
    const config = JSON.parse(fs.readFileSync("./data/config.json", "utf-8"));

    const rest = new REST({version: 10}).setToken(config.token);

    client.on("ready", function() {
        console.log(`Logged in as ${client.user.tag}`);
        for (const guildId of config.guild_ids) {
            SlashCommand.putGuildCommands(rest, client, guildId,
                new CommandAddReply(database), new CommandRemoveReply(database)
            );
        }
    });

    client.on("messageCreate", async function(message) {
        if (message.author.bot) {
            return;
        }
        const guildId = message.guildId;
        const searchResult = await DatabaseUtil.runSqlAsync(database, `
            SELECT content FROM reply_contents WHERE guild_id = ? AND reply_id IN (
                SELECT reply_id FROM reply_keywords WHERE keyword = ?
            );`, guildId, message.content);
        if (searchResult.length >= 1) {
            message.reply(searchResult[0].content);
        }
    });

    client.login(config.token);
}
