const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`import { Upa, Member } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';`, `import { Upa, Member } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';
import { useAuth } from '../lib/auth';`);

content = content.replace(`export default function UpaBial() {
  const [upas, setUpas] = useState<Upa[]>([]);`, `export default function UpaBial() {
  const { isAdmin } = useAuth();
  const [upas, setUpas] = useState<Upa[]>([]);`);

content = content.replace(`<div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => openBialModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Bial
          </button>
        </div>`, `{isAdmin && (
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => openBialModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Bial
            </button>
          </div>
        )}`);

content = content.replace(`{/* Admin inline buttons for Upa/Bial */}
                    <div className="absolute top-3 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openBialModal(upa); }}
                        className={\`p-1.5 rounded-lg transition-colors \${
                          isActive 
                            ? 'bg-white/20 text-white border-white/30 hover:bg-white/35' 
                            : 'bg-[#fcfaf7] text-stone-500 border-[#ecece0] hover:text-[#5A5A40]'
                        }\`}
                        title="Edit Bial / Upa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteBial(upa.id); }}
                        className={\`p-1.5 rounded-lg transition-colors \${
                          isActive 
                            ? 'bg-red-900/40 text-red-100 border-red-500/30 hover:bg-red-800/55' 
                            : 'bg-red-50 text-red-500 border-red-100 hover:text-red-700 hover:bg-red-100'
                        }\`}
                        title="Delete Bial / Upa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>`, `{/* Admin inline buttons for Upa/Bial */}
                    {isAdmin && (
                      <div className="absolute top-3 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openBialModal(upa); }}
                          className={\`p-1.5 rounded-lg transition-colors \${
                            isActive 
                              ? 'bg-white/20 text-white border-white/30 hover:bg-white/35' 
                              : 'bg-[#fcfaf7] text-stone-500 border-[#ecece0] hover:text-[#5A5A40]'
                          }\`}
                          title="Edit Bial / Upa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteBial(upa.id); }}
                          className={\`p-1.5 rounded-lg transition-colors \${
                            isActive 
                              ? 'bg-red-900/40 text-red-100 border-red-500/30 hover:bg-red-800/55' 
                              : 'bg-red-50 text-red-500 border-red-100 hover:text-red-700 hover:bg-red-100'
                          }\`}
                          title="Delete Bial / Upa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}`);

content = content.replace(`                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                          Selected Bial Upa
                        </span>
                        <button 
                          onClick={() => openBialModal(selectedUpa)}
                          className="p-1 text-stone-400 hover:text-[#5A5A40] transition rounded-md hover:bg-stone-100"
                          title="Edit current Upa details"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>`, `                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                          Selected Bial Upa
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={() => openBialModal(selectedUpa)}
                            className="p-1 text-stone-400 hover:text-[#5A5A40] transition rounded-md hover:bg-stone-100"
                            title="Edit current Upa details"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>`);
                      
content = content.replace(`                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openMemberModal()}
                        className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    </div>`, `                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => openMemberModal()}
                          className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Member
                        </button>
                      </div>
                    )}`);

content = content.replace(`{/* Actions overlay */}
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                            <button onClick={() => openMemberModal(member)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteMember(member.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>`, `{/* Actions overlay */}
                          {isAdmin && (
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                              <button onClick={() => openMemberModal(member)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteMember(member.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}`);


fs.writeFileSync('src/pages/UpaBial.tsx', content);
