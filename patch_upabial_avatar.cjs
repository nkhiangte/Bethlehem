const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">`, `                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {selectedUpa.imageUrl ? (
                        <img 
                          src={selectedUpa.imageUrl} 
                          alt={selectedUpa.name} 
                          className="w-16 h-16 rounded-full object-cover border border-[#ecece0] shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white border border-[#ecece0] text-[#5A5A40] rounded-full flex items-center justify-center text-2xl font-bold font-sans shrink-0">
                          {selectedUpa.name.split(' ')[1]?.charAt(0) || selectedUpa.name.charAt(4) || 'U'}
                        </div>
                      )}
                    <div>
                      <div className="flex items-center gap-2">`);

content = content.replace(`                          {selectedUpa.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">`, `                          {selectedUpa.phone}
                        </span>
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">`);

fs.writeFileSync('src/pages/UpaBial.tsx', content);
