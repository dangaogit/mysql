import { MysqlClientColumnOption, Bean, SourceOption } from "./decorators";

interface DefineMetadataResult<R> {
  symbol: Symbol;
  getMetadata<T>(target: T, defaultValue: R): R;
  getMetadata<T>(target: T): R | undefined;
  defineMetadata<T>(value: R, target: T): void;
}

export type ExcuterSqlType = "select" | "insert" | "update" | "delete";

export interface ExcuterSqlOption {
  sql: string;
  type: ExcuterSqlType;
  /** 数据过滤器，可进行数据过滤或重组结构等操作 */
  filterHandler?: (data: any) => any;
  onlyOne?: boolean;
  /** 单个查询所使用的table bean，会覆盖source中的table */
  table?: Bean<any>;
  /** select动态条件查询 */
  wheres?: boolean;
}

export const MysqlMetadata = {
  table: defineMetadata<Symbol>("mysql-conn.table"),
  column: defineMetadata<MysqlClientColumnOption[]>("mysql-conn.column"),
  excuterSql: defineMetadata<ExcuterSqlOption>("mysql-conn.excuter-sql"),
  source: defineMetadata<SourceOption>("mysql-conn.source"),
}


function defineMetadata<R>(name: string): DefineMetadataResult<R> {
  const symbol = Symbol(name);
  return {
    symbol,
    getMetadata<T>(target: T, defaultValue?: R) {
      let result = Reflect.getMetadata(symbol, target);
      if(typeof result === "undefined" && typeof defaultValue !== "undefined") {
        result = defaultValue;
        Reflect.defineMetadata(symbol, defaultValue, target);
      }
      return result;
    },
    defineMetadata<T>(value: R, target: T) {
      return Reflect.defineMetadata(symbol, value, target);
    }
  }
}
