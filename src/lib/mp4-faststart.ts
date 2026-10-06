/**
 * Pure-JS "qt-faststart": moves an MP4's `moov` index in front of `mdat` so browsers
 * can start playback after the first few KB instead of downloading the whole file.
 */

type Box = { type: string; start: number; size: number; header: number };

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf']);

function readBoxes(buf: Buffer, from: number, to: number): Box[] | null {
  const boxes: Box[] = [];
  let pos = from;
  while (pos + 8 <= to) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let header = 8;
    if (size === 1) {
      if (pos + 16 > to) return null;
      size = Number(buf.readBigUInt64BE(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = to - pos;
    }
    if (size < header || pos + size > to) return null;
    boxes.push({ type, start: pos, size, header });
    pos += size;
  }
  return boxes;
}

/**
 * Walks top-level box headers only (a few small reads). `true` when `moov` comes after `mdat`,
 * `false` when already streamable, `null` when the file is not a parseable MP4.
 */
export function mp4NeedsFaststart(fileSize: number, readAt: (offset: number, length: number) => Buffer): boolean | null {
  let pos = 0;
  let sawMdat = false;
  while (pos + 8 <= fileSize) {
    const header = readAt(pos, 16);
    if (header.length < 8) return null;
    let size = header.readUInt32BE(0);
    const type = header.toString('latin1', 4, 8);
    if (size === 1) {
      if (header.length < 16) return null;
      size = Number(header.readBigUInt64BE(8));
    } else if (size === 0) {
      size = fileSize - pos;
    }
    if (size < 8) return null;
    if (type === 'moov') return sawMdat;
    if (type === 'mdat') sawMdat = true;
    pos += size;
  }
  return null;
}

type Shift = { from: number; to: number; delta: number };

function shiftChunkOffsets(moov: Buffer, start: number, end: number, shift: Shift): boolean {
  const boxes = readBoxes(moov, start, end);
  if (!boxes) return false;
  for (const box of boxes) {
    const body = box.start + box.header;
    const boxEnd = box.start + box.size;
    if (CONTAINERS.has(box.type)) {
      if (!shiftChunkOffsets(moov, body, boxEnd, shift)) return false;
    } else if (box.type === 'stco') {
      const count = moov.readUInt32BE(body + 4);
      if (body + 8 + count * 4 > boxEnd) return false;
      for (let i = 0; i < count; i++) {
        const at = body + 8 + i * 4;
        const offset = moov.readUInt32BE(at);
        if (offset < shift.from || offset >= shift.to) continue;
        const next = offset + shift.delta;
        if (next > 0xffffffff) return false;
        moov.writeUInt32BE(next, at);
      }
    } else if (box.type === 'co64') {
      const count = moov.readUInt32BE(body + 4);
      if (body + 8 + count * 8 > boxEnd) return false;
      for (let i = 0; i < count; i++) {
        const at = body + 8 + i * 8;
        const offset = Number(moov.readBigUInt64BE(at));
        if (offset < shift.from || offset >= shift.to) continue;
        moov.writeBigUInt64BE(BigInt(offset + shift.delta), at);
      }
    } else if (box.type === 'cmov') {
      return false;
    }
  }
  return true;
}

/**
 * Returns a rewritten buffer with `moov` before the first `mdat`, or `null` when the file is
 * already streamable, not an MP4, or uses a layout this rewriter does not handle.
 * Output size is identical to the input.
 */
export function faststartMp4(input: Buffer): Buffer | null {
  const top = readBoxes(input, 0, input.length);
  if (!top) return null;
  const moovIndex = top.findIndex((b) => b.type === 'moov');
  const mdatIndex = top.findIndex((b) => b.type === 'mdat');
  if (moovIndex < 0 || mdatIndex < 0 || moovIndex < mdatIndex) return null;

  const moovBox = top[moovIndex];
  const insertAt = top[mdatIndex].start;
  const moov = Buffer.from(input.subarray(moovBox.start, moovBox.start + moovBox.size));
  const shift = { from: insertAt, to: moovBox.start, delta: moov.length };
  if (!shiftChunkOffsets(moov, moovBox.header, moov.length, shift)) return null;

  return Buffer.concat([
    input.subarray(0, insertAt),
    moov,
    input.subarray(insertAt, moovBox.start),
    input.subarray(moovBox.start + moovBox.size),
  ]);
}
