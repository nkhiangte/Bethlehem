const fs = require('fs');
let content = fs.readFileSync('src/pages/Directory.tsx', 'utf8');

content = content.replace(`import { Member } from '../types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';`, `import { Member } from '../types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function Directory() {
  const [members, setMembers] = useState<Member[]>([]);`, `export default function Directory() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);`);

content = content.replace(`<button 
          onClick={() => handleOpenModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Member
        </button>`, `{isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Member
          </button>
        )}`);

content = content.replace(`<td className="px-6 py-5 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(member)} 
                          className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-[#fcfaf7] border border-[#ecece0] rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)} 
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>`, `{isAdmin ? (
                      <td className="px-6 py-5 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(member)} 
                            className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-[#fcfaf7] border border-[#ecece0] rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(member.id)} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="px-6 py-5 whitespace-nowrap text-right text-xs"></td>
                    )}`);

fs.writeFileSync('src/pages/Directory.tsx', content);
