import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceManager } from '../ts/engine/persistence/PersistenceManager';
import { Series } from '../ts/thredlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadPatterns(directory: string): any[] {
  const patterns: any[] = [];
  const files = fs.readdirSync(directory);
  const jsonFiles = files.filter((file) => path.extname(file) === '.json');
  jsonFiles.forEach((file) => {
    const filePath = path.join(directory, file);
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents);
    patterns.push(jsonData);
  });

  return patterns;
}

async function insertPatterns(patterns: any[]): Promise<void> {
  await Series.forEach(patterns, async (pattern) => {
    return PersistenceManager.get().upsertPattern(pattern);
  });
}

async function run() {
  await PersistenceManager.get().connect();
  const relativeDirectory = path.join(__dirname, '../ts/config/patterns');
  const patterns = loadPatterns(relativeDirectory);
  await insertPatterns(patterns);
  await PersistenceManager.get().disconnect();
}

await run();
