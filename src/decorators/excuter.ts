import { MysqlMetadata, ExcuterSqlOption } from "../metadata.constants";
import { Bean } from ".";
import MysqlClient from "..";

export interface SourceOption {
  conn: MysqlClient;
  table: Bean<any>;
}

export interface ModifyResult {
  /** 受影响的行 */
  affectedRows: number;
  /** 改变的行 */
  changedRows: number;
  /** 失败数 */
  fieldCount: number;
  /** 插入数 */
  insertId: number;
  /** 返回提示语 */
  message: string;
  /** 协议 */
  protocol41: boolean;
  serverStatus: number;
  /** 警告数 */
  warningCount: number;
}

export type InsertResult = ModifyResult;
export type UpdateResult = ModifyResult;
export type DeleteResult = ModifyResult;

export function Select(excuterOption: Omit<ExcuterSqlOption, "type">) {
  return excuterFactory(async (option, ...values) => {
    const { wheres, sql, onlyOne, filterHandler } = excuterOption;
    const { conn } = option;
    let resultList: any[] = [];
    let sqls: { sql: string; values?: any[] } = {
      sql,
      values,
    };
    if (wheres) {
      const val = values[0];
      sqls = {
        sql: sql + val,
      };
    }
    resultList = await conn.query("select", sqls, excuterOption.table || option.table);

    /** 如果设置了只返回一条数据，则取下标0 */
    const result = onlyOne ? resultList[0] : resultList;
    if (resultList && filterHandler) {
      return filterHandler(result);
    } else {
      return result;
    }
  });
}

export interface InsertOption<T extends Bean<any>> {
  tbName: string;
  bean: T;
  insertKeys: (keyof InstanceType<T>)[];
}
export function Insert<T extends Bean<any>>(insertOption: InsertOption<T>): <T>(target: T, propertyKey: keyof T) => void;
export function Insert(sql: string): <T>(target: T, propertyKey: keyof T) => void;

export function Insert<T extends Bean<any>>(par: string | InsertOption<T>) {
  return excuterFactory(async (option, ...values) => {
    const { conn, table } = option;
    if (typeof par === "string") {
      const sql = par;
      return conn.query(
        "insert",
        {
          sql,
          values,
        },
        table
      );
    } else {
      const insertOption = par;
      const vals: any[] = values[0];
      return conn.query(
        "insert",
        {
          sql: `INSERT INTO ${insertOption.tbName} (??) VALUES ?`,
          values: [
            insertOption.insertKeys,
            vals.map((o) => {
              return insertOption.insertKeys.map((key) => o[key]);
            }),
          ],
        },
        table
      );
    }
  });
}

export interface UpdateOption<T = Bean<any>> {
  tbName: string;
  bean: T;
  wheres: string[];
}
export function Update(par: string | UpdateOption) {
  return excuterFactory(async (option, ...values) => {
    const { conn, table } = option;
    if (typeof par === "string") {
      const sql = par;
      return conn.query(
        "update",
        {
          sql,
          values,
        },
        table
      );
    } else {
      const updateOption = par;
      const obj: any = values[0];
      const kvs: any[] = [];
      updateOption.wheres.forEach((k) => {
        kvs.push(k);
        kvs.push(obj[k]);
        Reflect.deleteProperty(obj, k);
      });

      return conn.query(
        "update",
        {
          sql: `UPDATE ${updateOption.tbName} SET ? WHERE ${updateOption.wheres.map(() => "?? = ?").join(" AND ")}`,
          values: [obj, ...kvs],
        },
        table
      );
    }
  });
}

export function Delete(sql: string) {
  return excuterFactory(async (option, ...values) => {
    const { conn, table } = option;
    return conn.query(
      "delete",
      {
        sql,
        values,
      },
      table
    );
  });
}

export type Excuter<R, Arguments extends any[] = []> = (...values: Arguments) => Promise<R>;
export type ExcuterCallback<R, Arguments extends any[] = []> = (option: SourceOption, ...values: Arguments) => Promise<R>;

function excuterFactory(callback: ExcuterCallback<any, any[]>) {
  return <T extends InstanceType<Bean<unknown>>>(target: T, propertyKey: keyof T) => {
    /** 将执行器注入到对应属性 */
    target[propertyKey] = <T[keyof T]>(<any>(async (conn: MysqlClient, ...values: any[]) => {
      const option = MysqlMetadata.source.getMetadata(target.constructor);
      if (option) {
        if (conn && conn.query) {
          option.conn = conn;
          return callback(option, ...values);
        }
        return callback(option, conn, ...values);
      }

      throw `'excuter' appears in unexpected places!`;
    }));
  };
}

export function Source(option: SourceOption) {
  return <V>(targetClass: Bean<V>) => {
    MysqlMetadata.source.defineMetadata(option, targetClass);
  };
}
