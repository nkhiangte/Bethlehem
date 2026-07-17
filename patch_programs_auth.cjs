const fs = require('fs');
let content = fs.readFileSync('src/pages/Programs.tsx', 'utf8');

content = content.replace(`import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { InkhawmProgramme, PROGRAM_TITLES, DEFAULT_PROGRAM_ROLES, TawngtaiHruaituMonth, TawngtaiHruaituDay } from '../types';`, `import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { InkhawmProgramme, PROGRAM_TITLES, DEFAULT_PROGRAM_ROLES, TawngtaiHruaituMonth, TawngtaiHruaituDay } from '../types';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function Programs() {
  const [activeTab, setActiveTab] = useState<'inkhawm' | 'tawngtai'>('inkhawm');`, `export default function Programs() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'inkhawm' | 'tawngtai'>('inkhawm');`);

content = content.replace(`<div className="flex gap-2">
            <button 
              onClick={() => handleOpenModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Program
            </button>
          </div>`, `{isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Program
              </button>
            </div>
          )}`);

content = content.replace(`<div className="flex gap-2">
            <button 
              onClick={() => handleOpenTawngtaiModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              New Month
            </button>
          </div>`, `{isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenTawngtaiModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New Month
              </button>
            </div>
          )}`);

content = content.replace(`{/* Actions overlay */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                  <button onClick={() => handleOpenModal(prog)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(prog.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`, `{/* Actions overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(prog)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(prog.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}`);

content = content.replace(`{/* Actions overlay */}
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenTawngtaiModal(tMonth)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTawngtai(tMonth.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>`, `{/* Actions overlay */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                      <button onClick={() => handleOpenTawngtaiModal(tMonth)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteTawngtai(tMonth.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}`);

fs.writeFileSync('src/pages/Programs.tsx', content);
