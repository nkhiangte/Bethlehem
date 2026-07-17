const fs = require('fs');
let content = fs.readFileSync('src/pages/Committee.tsx', 'utf8');

content = content.replace(`import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';`, `import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function CommitteePage() {
  const [committees, setCommittees] = useState<Committee[]>([]);`, `export default function CommitteePage() {
  const { isAdmin } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);`);

content = content.replace(`<button 
          onClick={() => handleOpenModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Committee
        </button>`, `{isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Committee
          </button>
        )}`);

content = content.replace(`{/* Actions hover overlay */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                  <button onClick={() => handleOpenModal(committee)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(committee.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`, `{/* Actions hover overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(committee)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(committee.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}`);

fs.writeFileSync('src/pages/Committee.tsx', content);

let fellContent = fs.readFileSync('src/pages/Fellowship.tsx', 'utf8');

fellContent = fellContent.replace(`import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';`, `import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';`);

fellContent = fellContent.replace(`export default function FellowshipPage() {
  const [fellowships, setFellowships] = useState<Fellowship[]>([]);`, `export default function FellowshipPage() {
  const { isAdmin } = useAuth();
  const [fellowships, setFellowships] = useState<Fellowship[]>([]);`);

fellContent = fellContent.replace(`<button 
          onClick={() => handleOpenModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Fellowship
        </button>`, `{isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Fellowship
          </button>
        )}`);

fellContent = fellContent.replace(`{/* Actions hover overlay */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                  <button onClick={() => handleOpenModal(fellowship)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(fellowship.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`, `{/* Actions hover overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(fellowship)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(fellowship.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}`);

fs.writeFileSync('src/pages/Fellowship.tsx', fellContent);

