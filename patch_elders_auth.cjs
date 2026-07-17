const fs = require('fs');
let content = fs.readFileSync('src/pages/Elders.tsx', 'utf8');

content = content.replace(`import { Upa } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';`, `import { Upa } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function Elders() {
  const [upas, setUpas] = useState<Upa[]>([]);`, `export default function Elders() {
  const { isAdmin } = useAuth();
  const [upas, setUpas] = useState<Upa[]>([]);`);

content = content.replace(`<div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Kohhran Committee</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">List of ordained Upas and their areas (bial)</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Upa
        </button>
      </div>`, `<div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Kohhran Committee</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">List of ordained Upas and their areas (bial)</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Upa
          </button>
        )}
      </div>`);

content = content.replace(`{/* Actions overlay */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                  <button onClick={() => handleOpenModal(upa)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(upa.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`, `{/* Actions overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(upa)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(upa.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}`);

fs.writeFileSync('src/pages/Elders.tsx', content);
