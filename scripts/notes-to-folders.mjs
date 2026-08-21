#!/usr/bin/env node
// notes-to-folders.mjs — ดึงข้อความสินค้าจาก Apple Notes (โฟลเดอร์ DOOD) แล้วสร้าง
// โครงโฟลเดอร์ Desktop/DOOD Product/<D-M-Y>/<เลข.ชื่อย่อ>/ไม่มีชื่อ.rtf ให้ทีละชิ้น
//
// ใช้งาน 2 โหมด:
//   node scripts/notes-to-folders.mjs dump "15/8/2026"
//       -> พิมพ์ JSON { noteName, dateFolder, items:[{n,text}] } ให้ agent ไปตั้งชื่อย่อ
//   node scripts/notes-to-folders.mjs build <spec.json>
//       -> อ่าน spec { dateFolder, items:[{n,label,text}] } แล้วสร้างโฟลเดอร์+rtf
//
// spec.json ที่ build ต้องการ (label = ชื่อย่อที่ agent คิดให้):
//   { "dateFolder": "15-8-2026",
//     "items": [ { "n": 1, "label": "เสื้อเชิ้ตผ้าสักหลาด", "text": "ลองดู ..." }, ... ] }

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync, readdirSync, copyFileSync, statSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, basename } from "node:path";

const NOTES_FOLDER = "DOOD";
const DEST_ROOT = join(homedir(), "Desktop", "DOOD Product");
const RTF_NAME = "ไม่มีชื่อ.rtf"; // ชื่อ default ของ TextEdit ที่เจ้าของใช้อยู่

// ---------- helpers ----------

function osascript(script) {
  return execFileSync("osascript", ["-e", script], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// decode HTML entities จาก body ของ Apple Notes (บางอันในโน้ตพิมพ์ตกไม่มี ; เช่น &lt , H&ampM)
function decodeEntities(s) {
  return s
    .replace(/&lt;?/g, "<")
    .replace(/&gt;?/g, ">")
    .replace(/&quot;?/g, '"')
    .replace(/&#0?39;?/g, "'")
    .replace(/&apos;?/g, "'")
    .replace(/&nbsp;?/g, " ")
    .replace(/&amp;?/g, "&"); // ทำ &amp เป็นตัวสุดท้ายกันไปชนตัวอื่น
}

// แปลง body HTML ของโน้ต -> array ของบรรทัดสินค้า (เฉพาะที่ขึ้นต้น "ลองดู")
function parseNoteBody(html) {
  return html
    .split(/<\/div>/i)
    .map((chunk) =>
      decodeEntities(chunk.replace(/<[^>]*>/g, "")) // ตัด tag ทั้งหมด
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.startsWith("ลองดู"));
}

// "15/8/2026" -> "15-8-2026"
function dateFolderFromName(name) {
  return name.trim().replace(/\//g, "-");
}

function readNoteBody(noteName) {
  // ดึง body ของโน้ตชื่อ noteName ในโฟลเดอร์ DOOD
  const script = `
tell application "Notes"
  tell folder "${NOTES_FOLDER}"
    set matches to (notes whose name is "${noteName}")
    if (count of matches) is 0 then return "__NOT_FOUND__"
    return body of item 1 of matches
  end tell
end tell`;
  const body = osascript(script);
  if (body.trim() === "__NOT_FOUND__") {
    throw new Error(`ไม่พบโน้ตชื่อ "${noteName}" ในโฟลเดอร์ Notes "${NOTES_FOLDER}"`);
  }
  return body;
}

// เขียน rtf ผ่าน textutil (ได้ rtf แบบ TextEdit เปิดได้ + ไทยไม่เพี้ยน)
function writeRtf(destDir, text) {
  const tmp = mkdtempSync(join(tmpdir(), "dood-rtf-"));
  const txtPath = join(tmp, "in.txt");
  const rtfPath = join(destDir, RTF_NAME);
  writeFileSync(txtPath, text, "utf8");
  execFileSync("textutil", ["-convert", "rtf", "-output", rtfPath, txtPath]);
  rmSync(tmp, { recursive: true, force: true });
  return rtfPath;
}

// กันชื่อโฟลเดอร์พัง: ตัด / ที่ใช้ไม่ได้ใน path
function safeLabel(label) {
  return String(label).replace(/[\/:]/g, " ").replace(/\s+/g, " ").trim();
}

// ---------- modes ----------

function cmdDump(noteName) {
  const body = readNoteBody(noteName);
  const lines = parseNoteBody(body);
  const out = {
    noteName,
    dateFolder: dateFolderFromName(noteName),
    count: lines.length,
    items: lines.map((text, i) => ({ n: i + 1, text })),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

function cmdBuild(specPath) {
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  if (!spec.dateFolder) throw new Error("spec ต้องมี dateFolder");
  if (!Array.isArray(spec.items) || spec.items.length === 0) throw new Error("spec ต้องมี items");

  const dateDir = join(DEST_ROOT, spec.dateFolder);
  mkdirSync(dateDir, { recursive: true });

  const created = [];
  for (const it of spec.items) {
    if (!it.text || !it.label) throw new Error(`item ${it.n}: ต้องมีทั้ง text และ label`);
    const folderName = `${it.n}.${safeLabel(it.label)}`;
    const dir = join(dateDir, folderName);
    if (existsSync(dir)) {
      console.error(`⚠️  ข้าม (มีอยู่แล้ว): ${folderName}`);
      created.push({ n: it.n, folder: folderName, skipped: true });
      continue;
    }
    mkdirSync(dir, { recursive: true });
    writeRtf(dir, it.text);
    created.push({ n: it.n, folder: folderName, skipped: false });
    console.error(`✅ ${folderName}`);
  }

  console.error(`\nเสร็จ: สร้าง ${created.filter((c) => !c.skipped).length}/${spec.items.length} โฟลเดอร์ ที่`);
  console.error(`   ${dateDir}`);
  process.stdout.write(JSON.stringify({ dateDir, created }, null, 2) + "\n");
}

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".gif"]);

// natural sort: IMG_2 < IMG_10 (ไม่ใช่ IMG_10 < IMG_2 แบบ ascii)
function naturalSort(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

// อ่านเลข count ต่อชิ้นจาก arg: "5,2,3" หรือ "@path/to/counts.txt" (คั่นด้วย , เว้นวรรค หรือขึ้นบรรทัด)
function parseCounts(arg) {
  let raw = arg;
  if (arg.startsWith("@")) raw = readFileSync(arg.slice(1), "utf8");
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length)
    .map((s) => {
      const n = parseInt(s, 10);
      if (!Number.isFinite(n) || n < 0) throw new Error(`จำนวนรูปไม่ถูกต้อง: "${s}"`);
      return n;
    });
}

// หาโฟลเดอร์สินค้าในโฟลเดอร์วันที่ เรียงตามเลขนำหน้า "N.ชื่อ"
function listProductFolders(dateDir) {
  return readdirSync(dateDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+\./.test(d.name))
    .map((d) => ({ n: parseInt(d.name, 10), name: d.name }))
    .sort((a, b) => a.n - b.n);
}

function countImagesIn(dir) {
  return readdirSync(dir).filter((f) => !f.startsWith(".") && IMG_EXT.has("." + (f.split(".").pop() || "").toLowerCase())).length;
}

function cmdSplit(imagesDir, dateFolder, countsArg, fromArg) {
  const dateDir = join(DEST_ROOT, dateFolder);
  if (!existsSync(dateDir)) throw new Error(`ไม่พบโฟลเดอร์วันที่: ${dateDir} (สร้างด้วย build ก่อน)`);

  const allFolders = listProductFolders(dateDir);
  if (allFolders.length === 0) throw new Error(`ไม่พบโฟลเดอร์สินค้า (N.ชื่อ) ใน ${dateDir}`);

  // from = เริ่มเติมที่โฟลเดอร์เลขนี้ (ข้ามตัวก่อนหน้า + ข้ามรูปที่ตัวก่อนหน้าใช้ไปแล้ว)
  const from = fromArg ? parseInt(fromArg, 10) : null;
  const folders = from ? allFolders.filter((f) => f.n >= from) : allFolders;
  const skipImages = from
    ? allFolders.filter((f) => f.n < from).reduce((a, f) => a + countImagesIn(join(dateDir, f.name)), 0)
    : 0;

  const allImages = readdirSync(imagesDir)
    .filter((f) => !f.startsWith(".") && IMG_EXT.has("." + (f.split(".").pop() || "").toLowerCase()))
    .sort(naturalSort);
  if (allImages.length === 0) throw new Error(`ไม่พบไฟล์รูปใน ${imagesDir}`);
  const images = allImages.slice(skipImages); // ข้ามรูปที่โฟลเดอร์ก่อน from ใช้ไปแล้ว

  const counts = parseCounts(countsArg);

  // ตรวจความสอดคล้องก่อนทำจริง (กันรูปเลื่อนช่อง)
  if (counts.length > folders.length) {
    throw new Error(
      `จำนวนช่อง count (${counts.length}) มากกว่าจำนวนโฟลเดอร์สินค้า (${folders.length})`
    );
  }
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum > images.length) {
    throw new Error(
      `ผลรวมจำนวนรูปที่บอก (${sum}) มากกว่าจำนวนรูปจริงในโฟลเดอร์ (${images.length}) — เช็คตัวเลขอีกที`
    );
  }
  // โหมดเต็ม (บอกครบทุกโฟลเดอร์) ต้องรวมพอดีเป๊ะ กันพิมพ์เลขตกหล่น
  const full = counts.length === folders.length;
  if (full && sum !== images.length) {
    throw new Error(
      `บอกครบทุกโฟลเดอร์แต่ผลรวม (${sum}) ไม่เท่าจำนวนรูป (${images.length}) — เช็คตัวเลขอีกที`
    );
  }
  const partial = counts.length < folders.length || sum < images.length;

  // ก็อปตามลำดับ (เก็บต้นฉบับไว้ ไม่ย้าย, ใช้ชื่อไฟล์เดิม)
  let idx = 0;
  const report = [];
  for (let i = 0; i < counts.length; i++) {
    const f = folders[i];
    const take = counts[i];
    const dest = join(dateDir, f.name);
    const assigned = images.slice(idx, idx + take);
    idx += take;
    for (const img of assigned) {
      copyFileSync(join(imagesDir, img), join(dest, basename(img)));
    }
    report.push({ n: f.n, folder: f.name, images: assigned });
    console.error(
      `📷 ${f.name}  ←  ${take} รูป` +
        (assigned.length ? `  (${assigned[0]}${assigned.length > 1 ? "…" + assigned[assigned.length - 1] : ""})` : "  (ไม่มี)")
    );
  }
  console.error(`\nเสร็จ: ก็อป ${idx} รูป เข้า ${counts.length} โฟลเดอร์ (ต้นฉบับยังอยู่ที่เดิม)`);
  if (partial) {
    const leftImgs = images.length - idx;
    const leftFolders = folders.length - counts.length;
    console.error(`⏳ เหลือ: รูป ${leftImgs} ใบ (ตั้งแต่ใบที่ ${skipImages + idx + 1}) · โฟลเดอร์ยังไม่เติม ${leftFolders} อัน`);
  }
  process.stdout.write(JSON.stringify({ dateDir, filled: idx, report }, null, 2) + "\n");
}

// ---------- main ----------

const [mode, arg] = process.argv.slice(2);
try {
  const [, , , , splitDate, splitCounts, splitFrom] = process.argv;
  if (mode === "dump" && arg) cmdDump(arg);
  else if (mode === "build" && arg) cmdBuild(arg);
  else if (mode === "split" && arg && splitDate && splitCounts) cmdSplit(arg, splitDate, splitCounts, splitFrom);
  else {
    console.error("ใช้:  node scripts/notes-to-folders.mjs dump \"15/8/2026\"");
    console.error("      node scripts/notes-to-folders.mjs build spec.json");
    console.error("      node scripts/notes-to-folders.mjs split \"<โฟลเดอร์รูป>\" \"16-8-2026\" \"5,2,3,...\"");
    console.error("      (counts ใส่เป็น @counts.txt ก็ได้ถ้ายาว)");
    process.exit(1);
  }
} catch (e) {
  console.error("❌ " + e.message);
  process.exit(1);
}
