import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyAssets() {
  try {
    const srcDir = path.join(__dirname, '..', 'src', 'tools', 'templates');
    const destDir = path.join(__dirname, '..', 'dist', 'templates');
    
    // Ensure destination directory exists
    await fs.promises.mkdir(destDir, { recursive: true });
    
    // Copy all files from src/tools/templates to dist/templates
    const files = await fs.promises.readdir(srcDir);
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      const stat = await fs.promises.stat(srcPath);
      
      if (stat.isFile()) {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
    
    console.log('Assets copied successfully');
  } catch (error) {
    console.error('Error copying assets:', error);
    process.exit(1);
  }
}

copyAssets();