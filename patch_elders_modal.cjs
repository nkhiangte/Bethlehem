const fs = require('fs');
let content = fs.readFileSync('src/pages/Elders.tsx', 'utf8');

content = content.replace(`      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">`, `      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">`);

content = content.replace(`            <div className="p-6 space-y-4 font-sans">`, `            <div className="p-6 space-y-4 font-sans overflow-y-auto">`);

content = content.replace(`            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}`, `            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}`);

fs.writeFileSync('src/pages/Elders.tsx', content);
