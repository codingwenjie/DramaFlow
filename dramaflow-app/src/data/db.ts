import Dexie, { type Table } from 'dexie';

/** 通用键值：项目/模块/应用状态的持久化镜像 */
export interface KvRecord {
  key: string;
  value: string;
}

/** 文件存储：分镜图、配音音频等 Blob（突破 localStorage 5MB 限制） */
export interface FileRecord {
  key: string;
  blob: Blob;
  updatedAt: number;
}

class DramaFlowDB extends Dexie {
  kv!: Table<KvRecord, string>;
  files!: Table<FileRecord, string>;

  constructor() {
    super('dramaflow-db');
    this.version(1).stores({
      kv: 'key',
      files: 'key',
    });
  }
}

export const db = new DramaFlowDB();

export async function dbGet(key: string): Promise<string | undefined> {
  const rec = await db.kv.get(key);
  return rec?.value;
}

export async function dbSet(key: string, value: string): Promise<void> {
  await db.kv.put({ key, value });
}

export async function dbDelete(key: string): Promise<void> {
  await db.kv.delete(key);
}

export async function dbAllKeys(): Promise<string[]> {
  return (await db.kv.toArray()).map((r) => r.key);
}

export async function dbSaveFile(key: string, blob: Blob): Promise<void> {
  await db.files.put({ key, blob, updatedAt: Date.now() });
}

export async function dbLoadFile(key: string): Promise<Blob | undefined> {
  const rec = await db.files.get(key);
  return rec?.blob;
}

export async function dbDeleteFile(key: string): Promise<void> {
  await db.files.delete(key);
}

/** 按前缀删除文件（如某个项目的全部图片） */
export async function dbDeleteFilesByPrefix(prefix: string): Promise<void> {
  await db.files.where('key').between(prefix, prefix + '\uffff').delete();
}
