import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildCjs() {
  try {
    const distDir = path.join(__dirname, '..', 'dist');
    
    // Read the ES module index
    const esmContent = await fs.readFile(path.join(distDir, 'index.js'), 'utf8');
    
    // Convert ES module syntax to CommonJS
    let cjsContent = esmContent
      .replace(/export \* from "(.+?)";/g, 'Object.assign(module.exports, require("$1"));')
      .replace(/export \{ (.+?) \} from "(.+?)";/g, (match, exports, from) => {
        const exportList = exports.split(',').map(e => e.trim());
        return exportList.map(exp => `module.exports.${exp} = require("${from}").${exp};`).join('\n');
      });
    
    // Write CommonJS version
    await fs.writeFile(path.join(distDir, 'index.cjs'), cjsContent);
    
    console.log('CommonJS build created successfully');
  } catch (error) {
    console.error('Error building CommonJS version:', error);
    process.exit(1);
  }
}

buildCjs();