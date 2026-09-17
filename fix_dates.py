import sys

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """                {/* ===== DYNAMIC DATE BUTTONS ===== */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    ⚡ Available Reports based on your data
                  </h4>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <button
                      onClick={() => {
                        if (currentClassData.attendanceMarkedDates.length > 0) {
                          const sorted = [...currentClassData.attendanceMarkedDates].sort();
                          setFromDate(sorted[0]);
                          setToDate(sorted[sorted.length - 1]);
                          setDateError('');
                        }
                      }}
                      className="p-3 rounded-xl border-2 transition-all duration-200 bg-red-50 border-red-200 text-red-700 hover:shadow-md"
                    >
                      <div className="text-2xl mb-1">📚</div>
                      <div className="text-sm font-bold">All Time</div>
                    </button>
                    {(() => {
                      if (!currentClassData || currentClassData.attendanceMarkedDates.length === 0) return null;
                      
                      const dates = currentClassData.attendanceMarkedDates.map(d => new Date(d));
                      const years = [...new Set(dates.map(d => d.getFullYear()))].sort((a, b) => b - a);
                      
                      return years.map(year => {
                        const yearDates = dates.filter(d => d.getFullYear() === year).sort((a, b) => a.getTime() - b.getTime());
                        if (yearDates.length === 0) return null;
                        
                        const from = yearDates[0].toISOString().split('T')[0];
                        const to = yearDates[yearDates.length - 1].toISOString().split('T')[0];
                        const isSelected = fromDate === from && toDate === to;
                        
                        return (
                          <button
                            key={year}
                            onClick={() => {
                              setFromDate(from);
                              setToDate(to);
                              setDateError('');
                            }}
                            className={`p-3 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-blue-50 border-blue-200 text-blue-700 hover:shadow-md'}`}
                          >
                            <div className="text-2xl mb-1">📅</div>
                            <div className="text-sm font-bold">{year}</div>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Individual Month Quick Select */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Available months:</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        if (!currentClassData || currentClassData.attendanceMarkedDates.length === 0) return null;
                        
                        const dates = currentClassData.attendanceMarkedDates.map(d => new Date(d));
                        const monthsMap = new Map<string, { from: string, to: string, label: string }>();
                        
                        dates.forEach(d => {
                          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (!monthsMap.has(monthKey)) {
                            const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                            const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                            monthsMap.set(monthKey, {
                                from: first,
                                to: last,
                                label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                            });
                          }
                        });
                        
                        const months = Array.from(monthsMap.values()).sort((a, b) => b.from.localeCompare(a.from));
                        
                        return months.map(m => (
                          <button
                            key={m.label}
                            onClick={() => {
                              setFromDate(m.from);
                              setToDate(m.to);
                              setDateError('');
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              fromDate === m.from && toDate === m.to
                                ? 'bg-indigo-500 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            📅 {m.label}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </div>\n"""

out = []
skip = False
for i, line in enumerate(lines):
    if '{/* ===== QUICK YEAR BUTTONS ===== */}' in line:
        skip = True
        out.append(new_content)
    
    if skip and '{/* Manual Date Picker */}' in line:
        skip = False

    if not skip:
        out.append(line)

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out)

