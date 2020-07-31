import { MysqlMetadata } from "../metadata.constants";

export interface Bean<T> {
  new (): T & { constructor: Function };
}

export const MysqlTableSymbol = Symbol("MysqlTable");

export enum ColumnType {
  auto,
  int,
  string,
  boolean,
  date,
  float,
  null,
  object
}

export type MysqlClientColumnOption = AutoColumn | IntColumn | StringColumn | BooleanColumn | DateColumn | FloatColumn | NullColumn | ObjectColumn;
type KeyofType = number | symbol | string;

interface BaseColumn {
  field: KeyofType;
  outputFieldName: KeyofType;
}
interface IntColumn extends BaseColumn {
  type: ColumnType.int;
  default: number;
}
interface StringColumn extends BaseColumn {
  type: ColumnType.string;
  default: string;
}
interface BooleanColumn extends BaseColumn {
  type: ColumnType.boolean;
  default: boolean;
}
interface DateColumn extends BaseColumn {
  type: ColumnType.date;
  default: Date;
}
interface FloatColumn extends BaseColumn {
  type: ColumnType.float;
  default: number;
}
interface NullColumn extends BaseColumn {
  type: ColumnType.null;
  default: null;
}
interface ObjectColumn extends BaseColumn {
  type: ColumnType.object;
  default: object;
}
interface AutoColumn extends BaseColumn {
  type: ColumnType.auto;
}

export function MysqlClientColumn(type: ColumnType): <T>(target: T, propertyKey: keyof T) => void;
export function MysqlClientColumn(option: Partial<MysqlClientColumnOption>): <T>(target: T, propertyKey: keyof T) => void;
export function MysqlClientColumn<T>(target: T, propertyKey: keyof T): void;
export function MysqlClientColumn() {
  if (arguments.length === 1) {
    return <T>(target: T, propertyKey: keyof T) => {
      if (typeof arguments[0] === "object") {
        const option = arguments[0];
        columnFactory(target, { default: target[propertyKey], type: ColumnType.auto, field: propertyKey, outputFieldName: propertyKey, ...option });
      } else {
        const type = arguments[0];
        columnFactory(target, { default: target[propertyKey] as any, type, field: propertyKey, outputFieldName: propertyKey });
      }
    };
  }

  const [target, propertyKey] = arguments;
  columnFactory(target, {
    default: target[propertyKey],
    field: propertyKey,
    type: ColumnType.auto,
    outputFieldName: propertyKey
  });
}
function columnFactory<T>(target: T, option: MysqlClientColumnOption) {
  const columns = MysqlMetadata.column.getMetadata(target, []);
  columns.push(option);
}

export function MysqlClientTable(target: any) {
  MysqlMetadata.table.defineMetadata(MysqlTableSymbol, target);
}

export { MysqlClientTable as Table, MysqlClientColumn as Column };

export * from "./excuter";