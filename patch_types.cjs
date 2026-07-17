const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(`export interface Upa {
  id: string;
  name: string;
  bio: string;
  bial: string; // Area
  phone: string;
  imageUrl?: string;
}`, `export interface Upa {
  id: string;
  name: string;
  bio: string;
  bial: string; // Area
  phone: string;
  imageUrl?: string;
  mapImageUrl?: string;
  mapDescription?: string;
}`);

fs.writeFileSync('src/types.ts', content);
