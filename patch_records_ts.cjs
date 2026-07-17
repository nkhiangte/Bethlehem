const fs = require('fs');
let content = fs.readFileSync('src/pages/Records.tsx', 'utf8');

// Update recordTypes definition
content = content.replace(
`const recordTypes: { value: RecordType | 'all', label: string }[] = [
  { value: 'all', label: 'All Records' },
  { value: 'baptism', label: 'Baptism' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'death', label: 'Death' },
  { value: 'pem', label: 'Pem (Emigrate)' },
  { value: 'dawnsawn', label: 'Dawnsawn (Immigrate)' },
  { value: 'testimonial_received', label: 'Testimonial Received' },
  { value: 'testimonial_disbursement', label: 'Testimonial Disbursement' },
  { value: 'converted', label: 'Converted from other denom.' }
];`,
`const recordTypes: { value: RecordType, label: string }[] = [
  { value: 'baptism', label: 'Baptisma' },
  { value: 'marriage', label: 'Inneih' },
  { value: 'death', label: 'Mitthi' },
  { value: 'pem', label: 'Pem (Emigrate)' },
  { value: 'dawnsawn', label: 'Dawnsawn (Immigrate)' },
  { value: 'testimonial_received', label: 'Testimonial dawn' },
  { value: 'testimonial_disbursement', label: 'Testimonial pekchhuah' },
  { value: 'converted', label: 'Pawl dang atanga lo pakai' }
];`);

// Change default state of filterType
content = content.replace(
`  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');`,
`  const [filterType, setFilterType] = useState<RecordType | null>(null);`
);

// Update filteredRecords to just filter by filterType if it's not null, else empty array
content = content.replace(
`  const filteredRecords = churchRecords.filter(record => 
    filterType === 'all' || record.type === filterType
  );`,
`  const filteredRecords = churchRecords.filter(record => 
    record.type === filterType
  );`
);

// We need to also add an arrow left icon. So let's add ArrowLeft to lucide-react imports.
content = content.replace(
`import { Filter, Plus, X, Pencil, Trash2, Upload } from 'lucide-react';`,
`import { Filter, Plus, X, Pencil, Trash2, Upload, ArrowLeft } from 'lucide-react';`
);

// And update openRecordModal to use filterType if not null, otherwise 'baptism'
content = content.replace(
`    setRecordFormType(filterType !== 'all' ? filterType : 'baptism');`,
`    setRecordFormType(filterType !== null ? filterType : 'baptism');`
);

// Remove filterType === 'all' logic in handleFileUpload
content = content.replace(
`                onClick={() => {
                  if (filterType === 'all') {
                    alert('Please select a specific record type (e.g. Baptism) to import CSV');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}`,
`                onClick={() => {
                  if (filterType === null) {
                    alert('Please select a specific record type (e.g. Baptism) to import CSV');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}`
);

// Replace the UI for records tab
content = content.replace(
`      {activeTab === 'records' ? (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
            </div>
            
            <div className="flex gap-2">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => {
                  if (filterType === null) {
                    alert('Please select a specific record type (e.g. Baptism) to import CSV');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition shrink-0 font-sans flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>
              <button 
                onClick={() => openRecordModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New Record
              </button>
            </div>
          </div>`,
`      {activeTab === 'records' ? (
        <div className="space-y-6">
          {!filterType ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recordTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value as any)}
                  className="bg-white p-6 rounded-2xl border border-[#ecece0] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left group flex flex-col justify-between min-h-[120px]"
                >
                  <span className="text-[#5A5A40] font-serif italic text-xl">{type.label}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 group-hover:text-[#5A5A40] transition-colors flex items-center gap-1">
                    View Records &rarr;
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setFilterType(null)}
                    className="p-2 bg-white rounded-full border border-[#ecece0] text-stone-500 hover:bg-stone-50 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-serif italic text-[#5A5A40]">
                    {recordTypes.find(t => t.value === filterType)?.label} Records
                  </h2>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => {
                      if (filterType === null) {
                        alert('Please select a specific record type (e.g. Baptism) to import CSV');
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition shrink-0 font-sans flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import CSV
                  </button>
                  <button 
                    onClick={() => openRecordModal()}
                    className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Record
                  </button>
                </div>
              </div>`
);

// For the closing tags, we need to match carefully where activeTab === 'records' block ends
content = content.replace(
`          <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
            {loading ? (`,
`          <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
            {loading ? (`
); // No change, but wait. we opened a <> when filterType != null. We need to close it.

content = content.replace(
`                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 font-sans italic">
                    No records found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (`,
`                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 font-sans italic">
                    No records found.
                  </div>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      ) : (`
);

content = content.replace(
`                  {recordTypes.filter(t => t.value !== 'all').map(type => (`,
`                  {recordTypes.map(type => (`
);

fs.writeFileSync('src/pages/Records.tsx', content);
