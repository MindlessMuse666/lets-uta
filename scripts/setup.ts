import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDataDirectories, checkExecutable, parseNodeMajorVersion } from './setup-utils';

async function main(): Promise<void> {
  const nodeMajor = parseNodeMajorVersion(process.version);
  const dataRoot = process.env.KARAOKE_DATA_DIR ?? path.resolve(process.cwd(), 'data');
  const ffmpeg = await checkExecutable('ffmpeg');

  if (nodeMajor === null || nodeMajor < 22) {
    console.error('Требуется Node.js версии 22 или новее.');
    process.exitCode = 1;
    return;
  }

  try {
    await ensureDataDirectories(dataRoot);
  } catch {
    console.error('Не удалось создать или проверить каталоги данных. Проверьте права записи.');
    process.exitCode = 1;
    return;
  }

  console.log(`Node.js ${nodeMajor}: OK`);
  console.log(`Каталоги данных: ${dataRoot}`);
  console.log('Каталоги media, archives, models и tmp: OK');

  if (!ffmpeg.available) {
    console.error('FFmpeg не найден. Установите FFmpeg и запустите setup повторно.');
    process.exitCode = 1;
    return;
  }

  console.log(`FFmpeg ${ffmpeg.version ?? 'доступен'}: OK`);
  console.log('Setup завершён. После этого приложение может работать offline.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
