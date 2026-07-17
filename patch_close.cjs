const fs = require('fs');
let content = fs.readFileSync('src/pages/Records.tsx', 'utf8');

content = content.replace(`                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 font-sans italic">
                    No records found for the selected type.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (`, `                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 font-sans italic">
                    No records found for the selected type.
                  </div>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      ) : (`);

fs.writeFileSync('src/pages/Records.tsx', content);
