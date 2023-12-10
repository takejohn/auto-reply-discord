const { Client, GatewayIntentBits, SlashCommandBuilder, REST } = require("discord.js");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const SlashCommand = require("./classes/SlashCommand");
const crypto = require("crypto");

/**
 * sqlite3 データベース上で SQL クエリを実行する。
 * @param {sqlite3.Database} database SQL を実行する Database オブジェクト
 * @param {string} sql 実行する SQL クエリ
 * @param  {...any} param プレースホルダの値
 * @returns {Promise<any[]>} 結果の配列の Promise オブジェクト
 */
function runSqlAsync(database, sql, ...param) {
    return new Promise((resolve, reject) => database.all(sql, ...param,
        (err, rows) => err ? reject(err) : resolve(rows)));
}

/* resources フォルダ内のファイルを data フォルダにコピーする */
(function() {
    const resourceFileNames = fs.readdirSync("./resources");
    for (const resourceFileName of resourceFileNames) {
        try {
            fs.copyFileSync(`./resources/${resourceFileName}`, `./data/${resourceFileName}`, fs.constants.COPYFILE_EXCL);
        } catch (e) {
            // data フォルダにファイルが存在するので何もしない
        }
    }
})();

const database = new sqlite3.Database("./data/auto-reply.db");

(async function() {
    await runSqlAsync(database, "PRAGMA foreign_keys = true;");
    await runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_contents(
        reply_id char(36),
        guild_id char(20),
        content text
    );`);
    await runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_keywords(
        keyword text,
        reply_id char(36),
        primary key (keyword, reply_id)
    );`);
})();

const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});

/**
 * @type {{token: string, guild_ids: string[]}}
 */
const config = JSON.parse(fs.readFileSync("./data/config.json", "utf-8"));

const rest = new REST({version: 10}).setToken(config.token);

const commandAddReply = new SlashCommand(new SlashCommandBuilder()
    .setName("add-reply")
    .setDescription("自動リプライのパターンを追加します。")
    .addStringOption(option => option
        .setName("keyword")
        .setDescription("リプライ対象のメッセージ")
        .setRequired(true))
    .addStringOption(option => option
        .setName("content")
        .setDescription("リプライの内容")
        .setRequired(true)),
async function(interaction) {
    const guildId = interaction.guildId;
    const keyword = interaction.options.getString("keyword");
    const content = interaction.options.getString("content");
    if (content.length == 0) {
        interaction.reply("空の内容を設定することはできません。");
        return;
    }
    if ((await runSqlAsync(database, `SELECT keyword FROM reply_keywords WHERE reply_id IN (
            SELECT reply_id FROM reply_contents WHERE guild_id = ?
        ) AND keyword = ?;`, guildId, keyword)).length != 0) {
        interaction.reply("そのキーワードはすでに設定されています。");
        return;
    }
    const replyId = crypto.randomUUID();
    await runSqlAsync(database, "INSERT INTO reply_contents(reply_id, guild_id, content) VALUES (?, ?, ?)", replyId, guildId, content);
    await runSqlAsync(database, "INSERT INTO reply_keywords(keyword, reply_id) VALUES (?, ?)", keyword, replyId);
    interaction.reply(`自動リプライのパターンを追加しました。\n\`${keyword}\` → \`${content}\``);
});

const commandRemoveReply = new SlashCommand(new SlashCommandBuilder()
    .setName("remove-reply")
    .setDescription("自動リプライのパターンを削除します。")
    .addStringOption(option => option
        .setName("keyword")
        .setDescription("リプライ対象のメッセージ")
        .setRequired(true)),
async function(interaction) {
    const guildId = interaction.guildId;
    const keyword = interaction.options.getString("keyword");
    const selectResult = await runSqlAsync(database, `SELECT reply_id FROM reply_contents WHERE guild_id = ? AND reply_id IN (
            SELECT reply_id FROM reply_keywords WHERE keyword = ?
        );`, guildId, keyword);
    if (selectResult.length == 0) {
        interaction.reply("そのキーワードに対してはリプライが設定されていません。");
        return;
    }
    const replyId = selectResult[0].reply_id;
    await runSqlAsync(database, "DELETE FROM reply_keywords WHERE reply_id = ?;", replyId);
    await runSqlAsync(database, "DELETE FROM reply_contents WHERE reply_id = ?;", replyId);
    interaction.reply(`自動リプライのパターンを削除しました。\n\`${keyword}\``);
});

client.on("ready", function() {
    console.log(`Logged in as ${client.user.tag}`);
    for (const guildId of config.guild_ids) {
        SlashCommand.putGuildCommands(rest, client, guildId,
            commandAddReply, commandRemoveReply);
    }
});

client.on("messageCreate", async function(message) {
    if (message.author.bot) {
        return;
    }
    const guildId = message.guildId;
    const searchResult = await runSqlAsync(database, `
        SELECT content FROM reply_contents WHERE guild_id = ? AND reply_id IN (
            SELECT reply_id FROM reply_keywords WHERE keyword = ?
        );`, guildId, message.content);
    if (searchResult.length >= 1) {
        message.reply(searchResult[0].content);
    }
});

client.login(config.token);
