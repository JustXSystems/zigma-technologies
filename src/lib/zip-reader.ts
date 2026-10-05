import zlib from 'zlib';

/** Minimal ZIP reader for uploaded Office files: stored + deflate entries, no ZIP64, no encryption. */

export type ZipLimits = { maxEntries?: number; maxTotalBytes?: number };

type CentralEntry = { name: string; method: number; compressedSize: number; size: number; offset: number; flags: number };

function findEndOfCentralDirectory(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

export function readZip(buf: Buffer, limits: ZipLimits = {}): Map<string, () => Buffer> {
  const maxEntries = limits.maxEntries ?? 5_000;
  const maxTotal = limits.maxTotalBytes ?? 200 * 1024 * 1024;
  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) throw new Error('NOT_A_ZIP');

  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > maxEntries) throw new Error('ZIP_TOO_MANY_ENTRIES');

  const entries: CentralEntry[] = [];
  let p = cdOffset;
  let declaredTotal = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP_CORRUPT');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString(flags & 0x0800 ? 'utf8' : 'latin1');
    declaredTotal += size;
    entries.push({ name, method, compressedSize, size, offset, flags });
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (declaredTotal > maxTotal) throw new Error('ZIP_TOO_LARGE');

  const out = new Map<string, () => Buffer>();
  for (const e of entries) {
    if (e.name.endsWith('/')) continue;
    out.set(e.name.replace(/\\/g, '/').replace(/^\/+/, ''), () => {
      if (e.flags & 0x1) throw new Error('ZIP_ENCRYPTED');
      if (buf.readUInt32LE(e.offset) !== 0x04034b50) throw new Error('ZIP_CORRUPT');
      const nameLen = buf.readUInt16LE(e.offset + 26);
      const extraLen = buf.readUInt16LE(e.offset + 28);
      const start = e.offset + 30 + nameLen + extraLen;
      const data = buf.subarray(start, start + e.compressedSize);
      if (e.method === 0) return Buffer.from(data);
      if (e.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: Math.max(e.size, 1) + 1024 });
      throw new Error('ZIP_UNSUPPORTED_METHOD');
    });
  }
  return out;
}
