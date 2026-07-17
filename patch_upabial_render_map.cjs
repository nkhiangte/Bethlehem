const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-stone-500 font-sans font-medium">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                          {selectedUpa.bial}
                        </span>
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                          {selectedUpa.phone}
                        </span>
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openMemberModal()}
                        className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    </div>
                  </div>
                </div>`, `                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-stone-500 font-sans font-medium">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                          {selectedUpa.bial}
                        </span>
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                          {selectedUpa.phone}
                        </span>
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openMemberModal()}
                        className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    </div>
                  </div>
                  
                  {selectedUpa.mapImageUrl && (
                    <div className="mt-6 border-t border-[#ecece0] pt-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-3 font-sans">Bial Map</h3>
                      <div className="rounded-2xl overflow-hidden border border-[#ecece0] bg-white">
                        <img 
                          src={selectedUpa.mapImageUrl} 
                          alt="Bial Map" 
                          className="w-full h-auto max-h-[300px] object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {selectedUpa.mapDescription && (
                          <div className="p-4 bg-[#fcfaf7] border-t border-[#ecece0]">
                            <p className="text-sm text-stone-600 font-sans">{selectedUpa.mapDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>`);

fs.writeFileSync('src/pages/UpaBial.tsx', content);
