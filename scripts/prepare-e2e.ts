import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const relativeMediaPath =
  'media/fixtures/MASA-WORKS-DESIGN/MASA WORKS DESIGN ft.LosstimeLife-ドンドルマ.mp3';
const dataRoot = path.resolve(process.env.KARAOKE_DATA_DIR ?? path.join(process.cwd(), 'data'));
const sourcePath = path.resolve(process.cwd(), relativeMediaPath);
const targetPath = path.join(dataRoot, relativeMediaPath);

await mkdir(path.dirname(targetPath), { recursive: true });
await copyFile(sourcePath, targetPath);
