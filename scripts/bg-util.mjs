// ยูทิลตัดพื้นหลัง ใช้ร่วมกันระหว่าง admin-plugin (อัปโหลดทีละรูป) กับ add-images (bulk)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WORKER = fileURLToPath(new URL('./remove-bg.mjs', import.meta.url));

// เป็น "cutout" อยู่แล้วไหม (มี alpha + มุมทั้งสี่โปร่ง) → ถ้าใช่ ไม่ต้องตัดพื้นหลังซ้ำ
export async function isCutout(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!meta.hasAlpha) return false;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const w = info.width;
  const h = info.height;
  const alphaAt = (x, y) => data[(y * w + x) * ch + 3];
  const corners = [alphaAt(0, 0), alphaAt(w - 1, 0), alphaAt(0, h - 1), alphaAt(w - 1, h - 1)];
  return corners.every((a) => a < 40);
}

// ตัดพื้นหลังผ่าน worker แยกโปรเซส (กันชน libvips ของ @imgly กับ sharp หลัก) → คืน PNG buffer โปร่ง
export async function removeBgViaWorker(inputBuffer) {
  const png = await sharp(inputBuffer).png().toBuffer();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dood-bg-'));
  const inPath = path.join(dir, 'in.png');
  const outPath = path.join(dir, 'out.png');
  try {
    fs.writeFileSync(inPath, png);
    const r = spawnSync(process.execPath, [WORKER, inPath, outPath], {
      encoding: 'utf8',
      timeout: 60000,
    });
    if (r.status !== 0 || !fs.existsSync(outPath)) {
      throw new Error('ตัดพื้นหลังไม่สำเร็จ: ' + String(r.stderr || r.error || '').slice(0, 200));
    }
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ตัดพื้นหลังตามโหมด: 'auto' (ตัดถ้ายังไม่โปร่ง) | 'on' (ตัดเสมอ) | 'off' (ไม่ตัด)
export async function maybeRemoveBg(buffer, mode = 'auto') {
  const shouldRemove = mode === 'on' || (mode === 'auto' && !(await isCutout(buffer)));
  return shouldRemove ? removeBgViaWorker(buffer) : buffer;
}
