const { SlashCommandBuilder } = require("discord.js");
const SlashCommand = require("../SlashCommand");
const DatabaseUtil = require("../DatabaseUtil");

class CommandRemoveReply extends SlashCommand {

    static #OPTION_NAME_KEYWORD = "keyword";

    /**
     * @type {import("sqlite3").Database}
     */
    #database;

    constructor(database) {
        super(new SlashCommandBuilder()
            .setName("remove-reply")
            .setDescription("自動リプライのパターンを削除します。")
            .addStringOption(option => option
                .setName(CommandRemoveReply.#OPTION_NAME_KEYWORD)
                .setDescription("リプライ対象のメッセージ")
                .setRequired(true)));
        this.#database = database;
    }

    /**
     * @param {import("discord.js").ChatInputCommandInteraction<CacheType>} interaction interactionCreate イベントの内容
     * @override
     */
    async execute(interaction) {
        const guildId = interaction.guildId;
        const keyword = interaction.options.getString(CommandRemoveReply.#OPTION_NAME_KEYWORD);
        const selectResult = await DatabaseUtil.runSqlAsync(this.#database, `SELECT reply_id FROM reply_contents WHERE guild_id = ? AND reply_id IN (
            SELECT reply_id FROM reply_keywords WHERE keyword = ?
        );`, guildId, keyword);
        if (selectResult.length == 0) {
            interaction.reply("そのキーワードに対してはリプライが設定されていません。");
            return;
        }
        const replyId = selectResult[0].reply_id;
        await DatabaseUtil.runSqlAsync(this.#database, "DELETE FROM reply_keywords WHERE reply_id = ?;", replyId);
        await DatabaseUtil.runSqlAsync(this.#database, "DELETE FROM reply_contents WHERE reply_id = ?;", replyId);
        interaction.reply(`自動リプライのパターンを削除しました。\n\`${keyword}\``);
    }

}

module.exports = CommandRemoveReply;
