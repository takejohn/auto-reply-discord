const { Routes } = require("discord.js");

/**
 * スラッシュコマンドを表すオブジェクト
 */
class SlashCommand {

    /**
     * @type {import("discord.js").RESTPostAPIChatInputApplicationCommandsJSONBody}
     */
    #jsonBody;

    /**
     * @type {((interaction: import("discord.js").ChatInputCommandInteraction<CacheType>) => void) | undefined}
     */
    #executeFunc;

    /**
     * スラッシュコマンドを表すオブジェクトを作成する。
     * @param {import("discord.js").SlashCommandBuilder} builder スラッシュコマンドの元となるビルダーオブジェクト
     * @param {((interaction: import("discord.js").ChatInputCommandInteraction<CacheType>) => void) | undefined} executeFunc コマンドの実行時に行う処理
     */
    constructor(builder, executeFunc) {
        this.#jsonBody = builder.toJSON();
        this.#executeFunc = executeFunc;
    }

    /**
     * コマンドを実行する。
     * @param {import("discord.js").ChatInputCommandInteraction<CacheType>} interaction interactionCreate イベントの内容
     */
    async execute(interaction) {
        this.#executeFunc(interaction);
    }

    /**
     * ギルドにコマンドを追加する。
     * @param {import("discord.js").REST} rest エンドポイントのハンドラを管理する REST オブジェクト
     * @param {import("discord.js").Client} client bot のクライアント
     * @param {string} guildId コマンドを追加するギルド ID
     * @param {...import("discord.js").SlashCommand} commands 追加するコマンド
     */
    static async putGuildCommands(rest, client, guildId, ...commands) {
        await rest.put(Routes.applicationGuildCommands(client.application.id, guildId), {
            body: Array.from(commands).map(command => command.#jsonBody)
        });
        this.#implementCommands(client, guildId, ...commands);
    }

    /**
     * ギルドに対してコマンドを実装する。
     * @param {import("discord.js").Client} client bot のクライアント
     * @param {string} guildId コマンドを追加するギルド ID
     * @param {...import("discord.js").SlashCommand} commands 実装を設定するコマンド
     */
    static async #implementCommands(client, guildId, ...commands) {
        /** @type {Map<string, SlashCommand>} */
        const nameCommandMap = new Map();
        for (const command of commands) {
            nameCommandMap.set(command.#jsonBody.name, command);
        }
        client.on("interactionCreate", async function(interaction) {
            if (interaction.guildId != guildId || !interaction.isChatInputCommand()) {
                return;
            }
            const command = nameCommandMap.get(interaction.commandName);
            if (command === void 0) {
                return;
            }
            await command.execute(interaction);
        });
    }

}

module.exports = SlashCommand;
