import zlib from 'zlib';

/** Minimal ZIP (PKZIP 2.0) writer: UTF-8 names, deflate or store, no ZIP64 (archives < 4 GB, < 65k entries). */

export type ZipEntry = { name: string; data: Buffer; date?: Date; compress?: boolean };

const STORE_EXT = /\.(zip|xlsx|docx|pptx|pdf|png|jpe?g|gif|webp|mp4|mov|gz|7z|rar)$/i;
const MAX_U32 = 0xffffffff;

let crcTable: Uint32Array | null = null;
function crc32(buf: Buffer): number {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date) {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export class ZipBuilder {
  private offset = 0;
  private central: Buffer[] = [];
  private names = new Set<string>();

  get bytesWritten() {
    return this.offset;
  }

  /** Returns the chunks for one entry (local header + data). */
  entry(input: ZipEntry): Buffer[] {
    let name = input.name.replace(/\\/g, '/').replace(/^\/+/, '');
    if (this.names.has(name)) {
      const dot = name.lastIndexOf('.');
      let i = 2;
      while (this.names.has(dot > 0 ? `${name.slice(0, dot)} (${i})${name.slice(dot)}` : `${name} (${i})`)) i++;
      name = dot > 0 ? `${name.slice(0, dot)} (${i})${name.slice(dot)}` : `${name} (${i})`;
    }
    this.names.add(name);
    if (this.names.size > 65_000) throw new Error('Too many files for one archive — narrow the export.');

    const nameBuf = Buffer.from(name, 'utf8');
    const raw = input.data;
    const crc = crc32(raw);
    const shouldCompress = input.compress ?? (!STORE_EXT.test(name) && raw.length > 64);
    let data = raw;
    let method = 0;
    if (shouldCompress) {
      const deflated = zlib.deflateRawSync(raw, { level: 6 });
      if (deflated.length < raw.length) {
        data = deflated;
        method = 8;
      }
    }
    if (this.offset + 30 + nameBuf.length + data.length > MAX_U32) {
      throw new Error('Export exceeds 4 GB — narrow the date range or exclude attachments.');
    }
    const { time, date } = dosDateTime(input.date ?? new Date());
    const flags = 0x0800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(flags, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(this.offset, 42);
    this.central.push(cd, nameBuf);

    this.offset += local.length + nameBuf.length + data.length;
    return [local, nameBuf, data];
  }

  /** Central directory + end record. */
  finish(): Buffer {
    const cdBuf = Buffer.concat(this.central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.names.size, 8);
    end.writeUInt16LE(this.names.size, 10);
    end.writeUInt32LE(cdBuf.length, 12);
    end.writeUInt32LE(this.offset, 16);
    this.offset += cdBuf.length + end.length;
    return Buffer.concat([cdBuf, end]);
  }
}

export function zipToBuffer(entries: ZipEntry[]): Buffer {
  const zip = new ZipBuilder();
  const parts: Buffer[] = [];
  for (const e of entries) parts.push(...zip.entry(e));
  parts.push(zip.finish());
  return Buffer.concat(parts);
}

/** Pull-based stream: the next entry is produced only when the client has read the previous one. */
export function zipReadableStream(entries: AsyncIterable<ZipEntry>): ReadableStream<Uint8Array> {
  const it = entries[Symbol.asyncIterator]();
  const zip = new ZipBuilder();
  let finished = false;
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (finished) return;
        try {
          const next = await it.next();
          if (next.done) {
            finished = true;
            controller.enqueue(new Uint8Array(zip.finish()));
            controller.close();
            return;
          }
          for (const chunk of zip.entry(next.value)) controller.enqueue(new Uint8Array(chunk));
        } catch (err) {
          finished = true;
          controller.error(err);
        }
      },
      async cancel() {
        finished = true;
        await it.return?.();
      },
    },
    { highWaterMark: 1 }
  );
}
