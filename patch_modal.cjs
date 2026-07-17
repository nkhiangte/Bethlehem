const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`      {/* Bial Modal */}
      {isBialModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">`, `      {/* Bial Modal */}
      {isBialModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-3xl shadow-xl border border-[#e0e0d5] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">`);

content = content.replace(`            <div className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Area Name (Add name of Upa Bial)</label>`, `            <div className="p-6 font-sans overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Area Name (Add name of Upa Bial)</label>`);

content = content.replace(`              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Biography / Remarks (Optional)</label>
                <textarea 
                  value={elderBio} 
                  onChange={e => setElderBio(e.target.value)}
                  placeholder="e.g. Ordained in 2018..."
                  rows={3}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Description (Optional)</label>`, `              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Biography / Remarks (Optional)</label>
                <textarea 
                  value={elderBio} 
                  onChange={e => setElderBio(e.target.value)}
                  placeholder="e.g. Ordained in 2018..."
                  rows={3}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Description (Optional)</label>`);

content = content.replace(`                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">`, `                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">`);

content = content.replace(`      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">`, `      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">`);

content = content.replace(`            <div className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Select Upa Bial (Respective Bial)</label>`, `            <div className="p-6 space-y-4 font-sans overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Select Upa Bial (Respective Bial)</label>`);

content = content.replace(`                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">`, `                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">`);

fs.writeFileSync('src/pages/UpaBial.tsx', content);
