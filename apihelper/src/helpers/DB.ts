import { Pool } from "./Pool.js";
import { PoolConnection, QueryError } from "mysql2";
import { LoggingHelper } from "./LoggingHelper.js";

export class DB {

  // wraps in promise
  static async getConnection() {
    const promise: Promise<PoolConnection> = new Promise((resolve, reject) => {
      Pool.current.getConnection((ex, conn) => { if (ex) reject(ex); else resolve(conn); });
    });
    const connection: PoolConnection = await promise;
    return connection;
  }

  // wraps in promise
  static async getQuery(connection: PoolConnection, sql: string, params: unknown[]) {
    const promise: Promise<unknown> = new Promise((resolve, reject) => {
      connection.query(sql, params, async (ex: QueryError | null, rows: unknown) => {
        if (ex) { LoggingHelper.getCurrent().error(ex); reject(ex); } else { resolve(rows); }
      });
    });
    const query: unknown = await promise;
    return query;
  }

  public static async query(sql: string, params: unknown[]) {
    let result: unknown = null;
    const connection = await this.getConnection();
    try { result = await this.getQuery(connection, sql, params); } catch (ex: unknown) { LoggingHelper.getCurrent().error(ex as Error); } finally { connection.release(); }
    return result;
  }

  public static async queryOne(sql: string, params: unknown[]) {
    const result = await this.query(sql, params) as unknown[];
    return result?.length > 0 ? result[0] : null;
  }
}
