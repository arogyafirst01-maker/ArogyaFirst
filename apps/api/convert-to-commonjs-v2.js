#!/usr/bin/env node
/**
 * Proper ES Modules to CommonJS Converter
 * Handles all export patterns correctly
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function convertFileToCommonJS(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Step 1: Collect all named exports
  const namedExports = new Set();
  const exportRegex = /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    namedExports.add(match[1]);
  }

  // Step 2: Remove 'export' keyword from export declarations
  content = content.replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ');
  content = content.replace(/export\s+default\s+/g, '');

  // Step 3: Convert import statements
  // import { x, y } from 'module' -> const { x, y } = require('module')
  content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g, (match, names, modulePath) => {
    return `const { ${names.trim()} } = require('${modulePath}')`;
  });

  // import x from 'module' -> const x = require('module')
  content = content.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, name, modulePath) => {
    return `const ${name} = require('${modulePath}')`;
  });

  // import 'module' -> require('module')
  content = content.replace(/import\s+['"]([^'"]+)['"]/g, "require('$1')");

  // Step 4: Handle default exports (export default X)
  // Find the last statement that's exported as default and replace with module.exports
  const defaultExportMatch = content.match(/^(const|let|var|function|class)\s+(\w+)\s*=(.+?)(?=\n(?:const|let|var|function|class|\}))/ms);
  if (defaultExportMatch) {
    // It's already been converted, just needs module.exports at the end
    if (namedExports.size > 0) {
      // Multiple named exports
      const exportsObj = Array.from(namedExports).map(name => `${name}`).join(', ');
      content = content.replace(/\n(?=const|let|var|function|class|$)/g, '');
      if (!content.includes('module.exports')) {
        content += `\n\nmodule.exports = { ${exportsObj} };\n`;
      }
    } else if (content.match(/^(const|let|var)\s+(\w+)\s*=/m)) {
      // Single default export
      const match = content.match(/^(const|let|var)\s+(\w+)\s*=/m);
      if (match) {
        const varName = match[2];
        if (!content.includes('module.exports')) {
          content = content.replace(/\n$/, '') + `\n\nmodule.exports = ${varName};\n`;
        }
      }
    }
  } else if (namedExports.size > 0) {
    // Multiple named exports
    const exportsObj = Array.from(namedExports).map(name => `${name}`).join(', ');
    if (!content.includes('module.exports')) {
      content = content.replace(/\n$/, '') + `\n\nmodule.exports = { ${exportsObj} };\n`;
    }
  }

  // Remove any trailing export { } statements
  content = content.replace(/\nexport\s*{\s*[^}]*\s*}/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js') && !file.includes('minimal') && !file.includes('simple') && !file.includes('test')) {
      if (convertFileToCommonJS(filePath)) {
        console.log(`✓ Re-converted: ${path.relative(srcDir, filePath)}`);
      }
    }
  });
}

console.log('Re-converting ES Modules to CommonJS (proper exports handling)...');
walkDir(srcDir);
console.log('Re-conversion complete!');
