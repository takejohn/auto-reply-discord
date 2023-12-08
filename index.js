const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const sqlite3 = require("sqlite3");

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
    await runSqlAsync(database, `PRAGMA foreign_keys = true;`);
    await runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_messages(
        id integer primary key autoincrement,
        message text
    );`);
    await runSqlAsync(database, `CREATE TABLE IF NOT EXISTS reply_keywords(
        keyword text primary key,
        message_id integer,
        foreign key (message_id) references reply_messages(id)
    );`);
    return database;
})();

const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});

const config = JSON.parse(fs.readFileSync("./data/config.json", "utf-8"));

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(config.token);
