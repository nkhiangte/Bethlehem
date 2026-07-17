const fs = require('fs');
let content = fs.readFileSync('src/pages/Records.tsx', 'utf8');

content = content.replace(`          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-white p-2 rounded-xl border border-[#ecece0]">
              <Filter className="w-4 h-4 mr-2" />
              <select 
                className="bg-transparent border-none focus:ring-0 cursor-pointer pr-6 text-[#5A5A40]"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                {recordTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>`, `          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {recordTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value as any)}
                  className={\`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors \${
                    filterType === type.value 
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                      : 'bg-white text-stone-500 border-[#ecece0] hover:bg-stone-50'
                  }\`}
                >
                  {type.label}
                </button>
              ))}
            </div>`);

fs.writeFileSync('src/pages/Records.tsx', content);
