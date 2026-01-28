import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function printDirectoryTree(dir, prefix = '') {
  // نجيب كل الملفات والفولدرات
  const files = readdirSync(dir);

  // نفصل الفولدرات عن الملفات
  const folders = files.filter(file => statSync(join(dir, file)).isDirectory());
  const filesOnly = files.filter(file => !statSync(join(dir, file)).isDirectory());

  // نطبع الفولدرات أولاً
  folders.forEach((folder, index) => {
    if (folder === 'node_modules') return; // نتجاهل فولدر node_modules عشان ميتعبناش
    const isLastFolder = index === folders.length - 1 && filesOnly.length === 0;
    console.log(prefix + (isLastFolder ? '└── ' : '├── ') + folder);

    // ندخل الفولدر ونطبع محتوياته
    printDirectoryTree(join(dir, folder), prefix + (isLastFolder ? '    ' : '│   '));
  });

  // نطبع الملفات بعد الفولدرات
  filesOnly.forEach((file, index) => {
    const isLastFile = index === filesOnly.length - 1;
    console.log(prefix + (isLastFile ? '└── ' : '├── ') + file);
  });
}

printDirectoryTree('C:/Users/home/Desktop/backend platform/src/modules/api');