const { SlashCommandBuilder } = require("discord.js");
const SlashCommand = require("../SlashCommand");
const DatabaseUtil = require("../DatabaseUtil");
const crypto = require("crypto");

class CommandAddReply extends SlashCommand {

    static #OPTION_NAME_KEYWORD = "keyword";

    static #OPTION_NAME_CONTENT = "content";

    /**
     * @type {import("sqlite3").Database}
     */
    #database;

    /**
     * @param {sqlite3.Database} database コマンドで操作するデータベース
     */
    constructor(database) {
        super(new SlashCommandBuilder()
            .setName("add-reply")
            .setDescription("自動リプライのパターンを追加します。")
            .addStringOption(option => option
                .setName(CommandAddReply.#OPTION_NAME_KEYWORD)
                .setDescription("リプライ対象のメッセージ")
                .setRequired(true))
            .addStringOption(option => option
                .setName(CommandAddReply.#OPTION_NAME_CONTENT)
                .setDescription("リプライの内容")
                .setRequired(true)));
        this.#database = database;
    }

    /**
     * @param {import("discord.js").ChatInputCommandInteraction<CacheType>} interaction interactionCreate イベントの内容
     * @override
     */
    async execute(interaction) {
        const guildId = interaction.guildId;
        const keyword = interaction.options.getString(CommandAddReply.#OPTION_NAME_KEYWORD);
        const content = interaction.options.getString(CommandAddReply.#OPTION_NAME_CONTENT);
        if (content.length == 0) {
            interaction.reply("空の内容を設定することはできません。");
            return;
        }
        if ((await DatabaseUtil.runSqlAsync(this.#database, `SELECT keyword FROM reply_keywords WHERE reply_id IN (
            SELECT reply_id FROM reply_contents WHERE guild_id = ?
        ) AND keyword = ?;`, guildId, keyword)).length != 0) {
            interaction.reply("そのキーワードはすでに設定されています。");
            return;
        }
        const replyId = crypto.randomUUID();
        await DatabaseUtil.runSqlAsync(this.#database, "INSERT INTO reply_contents(reply_id, guild_id, content) VALUES (?, ?, ?)", replyId, guildId, content);
        await DatabaseUtil.runSqlAsync(this.#database, "INSERT INTO reply_keywords(keyword, reply_id) VALUES (?, ?)", keyword, replyId);
        interaction.reply(`自動リプライのパターンを追加しました。\n\`${keyword}\` → \`${content}\``);
    }

}

module.exports = CommandAddReply;
