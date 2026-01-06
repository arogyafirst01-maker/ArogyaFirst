#!/usr/bin/env node
/**
 * Convert ES Modules to CommonJS
 * Handles import -> require conversions automatically
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function convertFileToCommonJS(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Convert named imports: import { x, y } from 'module' -> const { x, y } = require('module')
  content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g, (match, names, modulePath) => {
    return `const { ${names.trim()} } = require('${modulePath}')`;
  });

  // Convert default imports: import express from 'express' -> const express = require('express')
  content = content.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, name, modulePath) => {
    return `const ${name} = require('${modulePath}')`;
  });

  // Convert default export: export default x -> module.exports = x
  content = content.replace(/export\s+default\s+(.+)(?:;)?$/gm, 'module.exports = $1;');

  // Convert named exports: export { x, y } -> module.exports = { x, y }
  content = content.replace(/export\s*{\s*([^}]+)\s*}(?:;)?$/gm, (match, names) => {
    const exports = names.split(',').map(n => {
      const trimmed = n.trim();
      return `${trimmed}`;
    }).join(', ');
    return `module.exports = { ${exports} };`;
  });

  // Convert export const x = ... -> const x = ...
  content = content.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

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
    } else if (file.endsWith('.js')) {
      if (convertFileToCommonJS(filePath)) {
        console.log(`✓ Converted: ${path.relative(srcDir, filePath)}`);
      }
    }
  });
}

console.log('Converting ES Modules to CommonJS...');
walkDir(srcDir);
console.log('Conversion complete!');
