class DatabaseUtil {

    /**
     * sqlite3 データベース上で SQL クエリを実行する。
     * @param {import("sqlite3").Database} database SQL を実行する Database オブジェクト
     * @param {string} sql 実行する SQL クエリ
     * @param  {...any} param プレースホルダの値
     * @returns {Promise<any[]>} 結果の配列の Promise オブジェクト
     */
    static runSqlAsync(database, sql, ...param) {
        return new Promise((resolve, reject) => database.all(sql, ...param,
            (err, rows) => err ? reject(err) : resolve(rows)));
    }

}

module.exports = DatabaseUtil;
