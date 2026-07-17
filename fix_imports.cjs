const fs = require('fs');

function addUseAuthImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { useAuth } from '../lib/auth';")) {
    content = content.replace("import { useState", "import { useAuth } from '../lib/auth';\nimport { useState");
    fs.writeFileSync(file, content);
  }
}

addUseAuthImport('src/pages/Directory.tsx');
addUseAuthImport('src/pages/Records.tsx');
addUseAuthImport('src/pages/Archive.tsx');
addUseAuthImport('src/pages/Committee.tsx');
addUseAuthImport('src/pages/Fellowship.tsx');
addUseAuthImport('src/pages/Gallery.tsx');
addUseAuthImport('src/pages/Home.tsx');
addUseAuthImport('src/pages/Programs.tsx');
addUseAuthImport('src/pages/UpaBial.tsx');
addUseAuthImport('src/pages/Elders.tsx');

