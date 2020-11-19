import "reflect-metadata";
import mysql from "mysql";
import { MysqlMetadata, ExcuterSqlType } from "./metadata.constants";
import { Bean, MysqlTableSymbol, ColumnType, MysqlClientColumnOption } from "./decorators";
import { appLog } from "./log";
import { LogOutputOption } from "@dangao/node-log";

const log = appLog.getDeriveLog("Index");

interface MysqlClientQuery {
  sql: string;
  values?: any[];
  callback?: mysql.queryCallback;
}

interface MysqlClientOption {
  log?: LogOutputOption;
}

export interface MysqlClient {
  query<BeanClass extends Bean<any> = Bean<any>>(type: "select", option: MysqlClientQuery, bean: BeanClass): Promise<InstanceType<BeanClass>[]>;
  query(type: Exclude<ExcuterSqlType, "select">, option: MysqlClientQuery): Promise<number>;
}

export class MysqlClient {
  public static log = appLog;

  private pool: mysql.Pool;

  constructor(config: string | mysql.PoolConfig, option: MysqlClientOption = {}) {
    this.pool = mysql.createPool(config);
    if (option.log) {
      appLog.setOption(option.log);
      log.setOption(option.log);
    }
    this.initLog();
  }

  public getPool() {
    return this.pool;
  }

  private initLog() {
    this.pool.on("connection", () => {
      log.info("[connection]", "mysql-conn connection.");
    });
    this.pool.on("enqueue", (err) => {
      err ? log.error("[enqueue]", JSON.stringify(err)) : log.warn("[enqueue]", "mysql-conn enqueue.");
      err && log.error("[enqueue]", err.stack);
    });
    this.pool.on("error", (err) => {
      log.error("[error]", JSON.stringify(err));
      log.error("[error]", err.stack);
    });
    // this.pool.on("release", conn => {
    //   log.info("[release]", "mysql-conn release");
    // });
    // this.pool.on("acquire", conn => {
    //   log.info("[acquire]", "mysql-conn acquire");
    // });
  }

  public async query<BeanClass extends Bean<any> = Bean<any>>(type: ExcuterSqlType, option: MysqlClientQuery, bean?: BeanClass): Promise<InstanceType<BeanClass>[] | number | undefined> {
    if (!this.isBean(bean)) {
      throw `This bean is not MysqlTable bean!`;
    }

    return new Promise(async (resolve, reject) => {
      const { sql, values } = option;
      const conn = this.getPool();
      conn.query(
        {
          sql,
          values,
        },
        function (this: { sql: string }, err, result) {
          if (err) {
            log.error("[excuter]", this.sql);
            log.error("[excuter]", err.message);
            log.error("[excuter]", err.stack);
            return reject(err);
          }

          log.info("[excuter]", this.sql);

          if (type === "select") {
            result = (<any[]>result).map((item) => {
              const entry = Reflect.construct(bean, []);
              const columns = MysqlMetadata.column.getMetadata(entry, []);

              columns.forEach((col) => {
                MysqlClient.packageColumn(entry, item, col);
              });
              return entry;
            });
          }

          resolve(result);
        }
      );
    });
  }

  private isBean(bean?: Bean<any>): bean is Bean<any> {
    return MysqlMetadata.table.getMetadata(bean) === MysqlTableSymbol;
  }

  private static packageColumn(entry: any, row: any, option: MysqlClientColumnOption) {
    const { type, outputFieldName, field } = option;
    switch (type) {
      case ColumnType.auto:
        entry[outputFieldName] = row[field];
        break;
      case ColumnType.boolean:
        entry[outputFieldName] = Boolean(row[field]);
        break;
      case ColumnType.int:
        entry[outputFieldName] = Number(row[field]);
        break;
      case ColumnType.string:
        entry[outputFieldName] = String(row[field]);
        break;
      case ColumnType.date:
        entry[outputFieldName] = new Date(row[field]);
        break;
      case ColumnType.object:
        entry[outputFieldName] = JSON.parse(row[field]);
        break;
      case ColumnType.float:
        entry[outputFieldName] = Number(row[field]);
        break;
      case ColumnType.null:
        entry[outputFieldName] = null;
        break;
      default:
        entry[outputFieldName] = row[field];
    }
  }
}

export default MysqlClient;

export * from "./decorators";
