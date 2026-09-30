declare module "archiver" {
  import type { Readable, Transform } from "node:stream";

  export interface ArchiverOptions {
    zlib?: { level?: number };
    store?: boolean;
    level?: number;
  }

  export interface EntryData {
    name: string;
  }

  export class Archiver extends Transform {
    append(source: Readable | Buffer | string, data?: EntryData): this;
    file(filename: string, data?: EntryData): this;
    finalize(): Promise<void>;
    abort(): this;
    on(event: "error" | "warning", listener: (error: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
}
