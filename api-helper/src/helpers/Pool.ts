import dotenv from "dotenv";
import mysql from "mysql2";
import { EnvironmentBase } from "./EnvironmentBase.js";

dotenv.config();

export class Pool {
  public static current: mysql.Pool;

  public static initPool() {
    const config = this.getConfig(EnvironmentBase.connectionString);

    Pool.current = mysql.createPool({
      connectionLimit: 3,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.userName,
      password: config.password,
      multipleStatements: true,
      waitForConnections: true,
      queueLimit: 9999,
      charset: "utf8mb4",
      typeCast: function castField(field: mysql.Field, useDefaultTypeCasting: () => unknown) {
        // convert bit(1) to bool
        if ((field.type === "BIT") && (field.length === 1)) {
          try {
            const bytes = field.buffer();
            return (bytes[0] === 1);
          } catch { return false; }
        }
        return useDefaultTypeCasting();
      }
    });
  }

  // a bit of a hack
  private static getConfig = (connectionString: string) => {
    // mysql://user:password@host:port/dbName
    const firstSplit = connectionString.replace("mysql://", "").split("@");
    const userPass = firstSplit[0].split(":");
    const userName = userPass[0];
    const password = userPass[1];

    const hostDb = firstSplit[1].split("/");
    const database = hostDb[1];
    const hostPort = hostDb[0].split(":");
    const host = hostPort[0];
    const port = parseInt(hostPort[1], 0);

    return { host, port, database, userName, password };

  };

}

