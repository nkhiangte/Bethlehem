const fs = require('fs');
let content = fs.readFileSync('src/pages/Records.tsx', 'utf8');

content = content.replace(`import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';`, `import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function Records() {
  const [activeTab, setActiveTab] = useState<'records' | 'damlokan'>('records');`, `export default function Records() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'damlokan'>('records');`);

content = content.replace(`<div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => openModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Record
            </button>
          </div>`, `{isAdmin && (
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={() => openModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Record
              </button>
            </div>
          )}`);

content = content.replace(`<div className="flex gap-2">
            <button 
              onClick={() => openDamloModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Record
            </button>
          </div>`, `{isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => openDamloModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Record
              </button>
            </div>
          )}`);

content = content.replace(`{/* Actions hover overlay */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                          <button onClick={() => openModal(record)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>`, `{/* Actions hover overlay */}
                        {isAdmin && (
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                            <button onClick={() => openModal(record)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}`);

content = content.replace(`{/* Actions overlay */}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                        <button onClick={() => openDamloModal(record)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDamloDelete(record.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>`, `{/* Actions overlay */}
                      {isAdmin && (
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                          <button onClick={() => openDamloModal(record)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDamloDelete(record.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}`);

fs.writeFileSync('src/pages/Records.tsx', content);

let archiveContent = fs.readFileSync('src/pages/Archive.tsx', 'utf8');

archiveContent = archiveContent.replace(`import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';`, `import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';`);

archiveContent = archiveContent.replace(`export default function Archive() {
  const [archives, setArchives] = useState<ArchiveYear[]>([]);`, `export default function Archive() {
  const { isAdmin } = useAuth();
  const [archives, setArchives] = useState<ArchiveYear[]>([]);`);

archiveContent = archiveContent.replace(`<button 
          onClick={() => handleOpenModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Year
        </button>`, `{isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Year
          </button>
        )}`);

archiveContent = archiveContent.replace(`{/* Actions hover overlay */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                  <button onClick={() => handleOpenModal(archive)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(archive.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`, `{/* Actions hover overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(archive)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(archive.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}`);
                
fs.writeFileSync('src/pages/Archive.tsx', archiveContent);

