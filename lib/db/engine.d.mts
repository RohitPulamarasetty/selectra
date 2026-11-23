export interface SqlConnection {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: Row[] }>;
  exec(sql: string): Promise<unknown>;
}

export interface Database extends SqlConnection {
  transaction<T>(operation: (tx: SqlConnection) => Promise<T>): Promise<T>;
}

export function dataDirectory(): string;
export function credentialDirectory(): string;
export function applyMigrations(db: Database): Promise<void>;
export function openDatabase(options?: { migrate?: boolean }): Promise<{ db: Database; close(): Promise<void> }>;
export function asUser<T>(db: Database, userId: string, operation: (tx: SqlConnection) => Promise<T>): Promise<T>;
