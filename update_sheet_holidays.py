import sys

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\components\AttendanceSheet.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Props
content = content.replace(
    '  holidayDates: string[];\n  onMarkHoliday: (date: string) => void;',
    '  holidayDates: {date: string, reason: string}[];\n  onMarkHoliday: (date: string, reason: string) => void;'
)

# Update states and methods
new_states = """  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeStudent, setRemoveStudent] = useState<Student | null>(null);

  // Holiday reason state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [holidayError, setHolidayError] = useState('');
"""
content = content.replace(
    '  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);\n  const [removeStudent, setRemoveStudent] = useState<Student | null>(null);',
    new_states
)

content = content.replace(
    'const isHoliday = holidayDates?.includes(currentDate);',
    'const isHoliday = holidayDates?.some(h => h.date === currentDate);\n  const currentHoliday = holidayDates?.find(h => h.date === currentDate);'
)

# Replace the holiday button to open modal instead of directly marking
content = content.replace(
    '                  onClick={() => onMarkHoliday(currentDate)}',
    '                  onClick={() => setShowHolidayModal(true)}'
)

# Update holiday banner
holiday_banner_old = """      {/* Holiday Banner */}
      {isHoliday && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏖️</span>
              <span className="font-medium text-blue-800">
                {new Date(currentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} is marked as a Holiday
              </span>
            </div>
            <button
              onClick={() => onRemoveHoliday(currentDate)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-white px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
            >
              🔄 Remove Holiday
            </button>
          </div>
        </div>
      )}"""

holiday_banner_new = """      {/* Holiday Banner */}
      {isHoliday && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏖️</span>
              <div>
                <span className="font-medium text-blue-800 block">
                  {new Date(currentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} is marked as a Holiday
                </span>
                <span className="text-sm text-blue-600 font-semibold block mt-0.5">
                  Reason: {currentHoliday?.reason}
                </span>
              </div>
            </div>
            <button
              onClick={() => onRemoveHoliday(currentDate)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-white px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
            >
              🔄 Remove Holiday
            </button>
          </div>
        </div>
      )}"""
content = content.replace(holiday_banner_old, holiday_banner_new)


holiday_modal = """      {/* ===== HOLIDAY MODAL ===== */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>🏖️</span> Mark as Holiday
              </h3>
              <button onClick={() => setShowHolidayModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              <div className="mb-4 text-sm text-gray-600">
                You are marking <strong>{new Date(currentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</strong> as a holiday.
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Saturday, Sunday, Gov Holiday, etc.)</label>
                <input
                  type="text"
                  value={holidayReason}
                  onChange={(e) => {
                    setHolidayReason(e.target.value);
                    setHolidayError('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Sunday"
                  autoFocus
                />
                {holidayError && <p className="text-red-500 text-xs mt-1">{holidayError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!holidayReason.trim()) {
                      setHolidayError('Please provide a reason for the holiday');
                      return;
                    }
                    onMarkHoliday(currentDate, holidayReason.trim());
                    setHolidayReason('');
                    setShowHolidayModal(false);
                    onAddNotification({ type: 'success', message: 'Holiday marked successfully' });
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Confirm Holiday
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}"""
content = content.replace('      {/* ===== EDIT MODAL ===== */}', holiday_modal)

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\components\AttendanceSheet.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
