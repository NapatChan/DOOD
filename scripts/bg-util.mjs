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

// ปิด "รูกลางเสื้อ": หลังตัดพื้นหลัง แถบขาว/สีอ่อน (เช่นเสื้อลายทาง) มัก
// ถูกโมเดลนึกว่าเป็นพื้นหลัง → กลายเป็นรูโปร่งกลางตัวเสื้อ
// วิธี: flood-fill จากขอบภาพผ่านพิกเซลโปร่ง = พื้นหลังจริง · พิกเซลโปร่งที่
// "เข้าไม่ถึงจากขอบ" = รูที่ล้อมด้วยเนื้อผ้า → เติม alpha=255 (สี RGB เดิมยังอยู่ใต้ alpha)
export async function fillInteriorHoles(buffer, alphaThreshold = 128) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  if (ch < 4) return buffer; // ไม่มี alpha = ไม่มีรู
  const n = w * h;
  const outside = new Uint8Array(n); // 1 = โปร่งที่ต่อถึงขอบ (พื้นหลังจริง)
  const stack = new Int32Array(n);
  let sp = 0;
  const clear = (i) => data[i * ch + 3] < alphaThreshold; // โปร่งพอถือเป็นพื้นหลัง/รู
  const seed = (x, y) => {
    const i = y * w + x;
    if (!outside[i] && clear(i)) { outside[i] = 1; stack[sp++] = i; }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w, y = (i / w) | 0;
    if (x > 0) { const j = i - 1; if (!outside[j] && clear(j)) { outside[j] = 1; stack[sp++] = j; } }
    if (x < w - 1) { const j = i + 1; if (!outside[j] && clear(j)) { outside[j] = 1; stack[sp++] = j; } }
    if (y > 0) { const j = i - w; if (!outside[j] && clear(j)) { outside[j] = 1; stack[sp++] = j; } }
    if (y < h - 1) { const j = i + w; if (!outside[j] && clear(j)) { outside[j] = 1; stack[sp++] = j; } }
  }
  let filled = 0;
  for (let i = 0; i < n; i++) {
    if (!outside[i] && clear(i)) { data[i * ch + 3] = 255; filled++; }
  }
  if (filled === 0) return buffer; // ไม่มีรู = คืนเดิม
  return sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
}

// ตัดพื้นหลังตามโหมด: 'auto' (ตัดถ้ายังไม่โปร่ง) | 'on' (ตัดเสมอ) | 'off' (ไม่ตัด)
export async function maybeRemoveBg(buffer, mode = 'auto') {
  const shouldRemove = mode === 'on' || (mode === 'auto' && !(await isCutout(buffer)));
  if (!shouldRemove) return buffer;
  const cut = await removeBgViaWorker(buffer);
  try {
    return await fillInteriorHoles(cut); // ปิดรูกลางเสื้อ (ลายทาง/สีอ่อน)
  } catch {
    return cut; // ถ้าปิดรูพลาด ใช้รูปที่ตัดแล้วไปก่อน ไม่ให้ pipeline ล้ม
  }
}
