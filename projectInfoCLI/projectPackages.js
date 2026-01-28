import { readdir, readFile } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

function getPackagesFromFiles() {
     const srcFolder = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
     const allPackages = new Set();

     readdir(srcFolder, (err) => {
          if (err) {
               console.error('Error reading directory:', err);
               return;
          }

          readFilesRecursively(srcFolder, allPackages, () => {
               console.log(Array.from(allPackages));
               Array.from(allPackages).forEach(pkg => {
                    console.log(`npm install ${pkg} --save`);
               });
          });
     });
}

function readFilesRecursively(folder, allPackages, callback) {
     readdir(folder, (err, files) => {
          if (err) {
               console.error('Error reading directory:', err);
               return;
          }

          let pending = files.length;
          if (!pending) return callback();

          files.forEach(file => {
               const filePath = join(folder, file);
               readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                         if (err.code === 'EISDIR') {
                              // It's a directory, read it recursively
                              readFilesRecursively(filePath, allPackages, () => {
                                   if (!--pending) callback();
                              });
                         } else {
                              console.error('Error reading file:', err);
                              if (!--pending) callback();
                         }
                         return;
                    }

                    const requireMatches = data.match(/require\(['"]([^'"]+)['"]\)/g) || [];
                    const importMatches = data.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];

                    const requirePackages = requireMatches
                         .map(match => match.replace(/require\(['"]([^'"]+)['"]\)/, '$1'))
                         .filter(pkg => pkg && !pkg.startsWith('.') && !pkg.startsWith('/'));
                    const importPackages = importMatches
                         .map(match => match.replace(/import\s+.*\s+from\s+['"]([^'"]+)['"]/, '$1'))
                         .filter(pkg => pkg && !pkg.startsWith('.') && !pkg.startsWith('/'));

                    requirePackages.forEach(pkg => allPackages.add(pkg));
                    importPackages.forEach(pkg => allPackages.add(pkg));

                    if (!--pending) callback();
               });
          });
     });
}

getPackagesFromFiles();