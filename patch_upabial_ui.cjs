const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsBialModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBial}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Bial / Upa
              </button>`, `                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {elderImageUrl && !selectedFile && (
                    <img src={elderImageUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-[#ecece0]" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsBialModalOpen(false)}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBial}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Save Bial / Upa'}
              </button>`);

fs.writeFileSync('src/pages/UpaBial.tsx', content);
