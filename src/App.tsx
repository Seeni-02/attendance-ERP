import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Student, AttendanceRecord, Notification } from './types';
import {
  createInitialAppData,
  createEmptyClassData,
  calculateZone,
  exportToCSV,
  downloadMonthWiseExcel
} from './utils/helpers';
import {
  saveClassToDB,
  loadFullAppDataFromDB,
  deleteClassFromDB,
  addStudentToDB,
  updateStudentInDB,
  removeStudentFromDB,
  markAttendanceInDB,
  saveClassNamesToDB,
  updateClassMetaInDB,
  addHolidayToDB,
  removeHolidayFromDB,
} from './utils/database';
import ClassSelection from './components/ClassSelection';
import StudentRegistration from './components/StudentRegistration';
import AttendanceSheet from './components/AttendanceSheet';
import Dashboard from './components/Dashboard';
import NotificationToast from './components/NotificationToast';
import { supabase } from './supabase';

// ==================== STUDENT SECTION COMPONENT ====================
interface StudentSectionProps {
  classTitle: string;
  students: Student[];
  totalWorkingDays: number;
}

const StudentSection: React.FC<StudentSectionProps> = ({ students, totalWorkingDays }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  const getPercentage = (student: Student): number => {
    const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
    if (totalDays === 0) return 100;
    return Math.round((student.Total_Days_Present / totalDays) * 100);
  };

  const filteredStudents = students.filter(s =>
    s.Student_Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.Register_Number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') comparison = a.Student_Name.localeCompare(b.Student_Name);
    if (sortBy === 'present') comparison = a.Total_Days_Present - b.Total_Days_Present;
    if (sortBy === 'absent') comparison = a.Total_Days_Absent - b.Total_Days_Absent;
    if (sortBy === 'od') comparison = a.On_Duty_Days - b.On_Duty_Days;
    if (sortBy === 'percentage') comparison = getPercentage(a) - getPercentage(b);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
  };

  const getSortArrow = (column: string) => {
    if (sortBy !== column) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const totalPresent = students.reduce((sum, s) => sum + s.Total_Days_Present, 0);
  const totalAbsent = students.reduce((sum, s) => sum + s.Total_Days_Absent, 0);
  const totalOD = students.reduce((sum, s) => sum + s.On_Duty_Days, 0);
  const avgPercentage = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + getPercentage(s), 0) / students.length) : 0;

  const getPercentageColor = (pct: number): string => {
    if (pct >= 90) return 'text-green-600 bg-green-50';
    if (pct >= 75) return 'text-blue-600 bg-blue-50';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getBarColor = (pct: number): string => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 75) return 'bg-blue-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or register number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Student Attendance Data</h2>
            <p className="text-xs text-gray-500 mt-1">Working Days: {totalWorkingDays}</p>
          </div>
          <div className="text-sm text-gray-500">{sortedStudents.length} students</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('name')}>Name {getSortArrow('name')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Reg No.</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('present')}>Present {getSortArrow('present')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('absent')}>Absent {getSortArrow('absent')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('od')}>OD {getSortArrow('od')}</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('percentage')}>% {getSortArrow('percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, index) => {
                const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
                const percentage = getPercentage(student);
                return (
                  <tr key={student.Student_ID} className={`border-b hover:bg-gray-50 ${percentage < 50 ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{student.Student_Name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{student.Register_Number}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-green-600">{student.Total_Days_Present}</span>
                      <span className="text-xs text-gray-400">/{totalDays}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">{student.Total_Days_Absent}</td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">{student.On_Duty_Days}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded ${getPercentageColor(percentage)}`}>{percentage}%</span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto mt-1">
                        <div className={`h-full rounded-full ${getBarColor(percentage)}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedStudents.length > 0 && (
          <div className="p-4 bg-gray-50 border-t flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span>Present: <strong className="text-green-600">{totalPresent}</strong></span>
              <span>Absent: <strong className="text-red-600">{totalAbsent}</strong></span>
              <span>OD: <strong className="text-indigo-600">{totalOD}</strong></span>
            </div>
            <span>Average: <strong className={avgPercentage >= 75 ? 'text-green-600' : 'text-red-600'}>{avgPercentage}%</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData>(() => createInitialAppData());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');

  // Debounce ref for realtime reloads — prevents rapid successive reloads
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we're currently loading to avoid overlapping loads
  const isReloadingRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dbData = await loadFullAppDataFromDB();
        if (dbData && dbData.savedClassNames.length > 0) {
          setAppData(dbData);
        }
      } catch (error) {
        console.error('Supabase failed:', error);
      }
      setIsLoading(false);
    };
    loadData();

    // Set up Real-time subscription
    // CRITICAL FIX: When reloading from DB, preserve currentClass, currentDate, currentView
    // so that the UI does NOT reset to the class-selection screen on every DB write.
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime change received!', payload);
          // Debounce: cancel any pending reload and schedule a new one
          if (realtimeDebounceRef.current) {
            clearTimeout(realtimeDebounceRef.current);
          }
          realtimeDebounceRef.current = setTimeout(async () => {
            if (isReloadingRef.current) return;
            isReloadingRef.current = true;
            try {
              const dbData = await loadFullAppDataFromDB();
              if (dbData) {
                // CRITICAL: Merge DB data while preserving navigation state
                setAppData(prev => ({
                  ...dbData,
                  currentClass: prev.currentClass,
                  currentDate: prev.currentDate,
                  currentView: prev.currentView,
                }));
              }
            } catch (e) {
              console.error('Realtime reload failed:', e);
            } finally {
              isReloadingRef.current = false;
            }
          }, 800);
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(subscription);
    };

  }, []);

  const currentClass = appData.currentClass;
  const currentClassData = currentClass ? appData.classes[currentClass] : null;

  const existingClasses: Record<string, boolean> = {};
  appData.savedClassNames.forEach(name => { existingClasses[name] = appData.classes[name]?.isLocked || false; });

  const studentCounts: Record<string, number> = {};
  appData.savedClassNames.forEach(name => {
    studentCounts[name] = (appData.classes[name]?.students || []).filter(s => !s.isRemoved).length;
  });

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp'>) => {
    setNotifications(prev => [...prev, { ...notif, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), timestamp: Date.now() }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAddNewClass = async (className: string) => {
    const newClassData = createEmptyClassData();
    setAppData(prev => ({ ...prev, savedClassNames: [...prev.savedClassNames, className], classes: { ...prev.classes, [className]: newClassData } }));
    try { await saveClassNamesToDB([...appData.savedClassNames, className]); await saveClassToDB(className, newClassData); } catch (e) { console.error(e); }
    addNotification({ type: 'success', message: `Class "${className}" created!` });
  };

  const handleDeleteClass = async (className: string) => {
    const newNames = appData.savedClassNames.filter(n => n !== className);
    setAppData(prev => { const c = { ...prev.classes }; delete c[className]; return { ...prev, savedClassNames: newNames, classes: c, currentClass: prev.currentClass === className ? null : prev.currentClass }; });
    try { await deleteClassFromDB(className); await saveClassNamesToDB(newNames); } catch (e) { console.error(e); }
    addNotification({ type: 'warning', message: `Class "${className}" deleted` });
  };

  const handleSelectClass = (className: string, workingDays: number, date: string) => {
    setAppData(prev => {
      const classData = { ...(prev.classes[className] || createEmptyClassData()) };
      if (!classData.isLocked) classData.totalWorkingDays = workingDays;
      return { ...prev, classes: { ...prev.classes, [className]: classData }, currentClass: className, currentDate: date, currentView: classData.isLocked ? 'dashboard' : 'students' };
    });
  };

  const handleSwitchClass = () => setAppData(prev => ({ ...prev, currentClass: null, currentView: 'dashboard' }));

  const handleAddStudent = async (student: Student) => {
    if (!currentClass) return;
    setAppData(prev => ({ ...prev, classes: { ...prev.classes, [currentClass]: { ...prev.classes[currentClass], students: [...prev.classes[currentClass].students, student] } } }));
    try { await addStudentToDB(currentClass, student); } catch (e) { console.error(e); }
  };

  const handleRemoveStudentBeforeLock = async (studentId: string) => {
    if (!currentClass) return;
    setAppData(prev => ({ ...prev, classes: { ...prev.classes, [currentClass]: { ...prev.classes[currentClass], students: prev.classes[currentClass].students.filter(s => s.Student_ID !== studentId) } } }));
    try { await removeStudentFromDB(currentClass, studentId); } catch (e) { console.error(e); }
    addNotification({ type: 'info', message: 'Student removed' });
  };

  const handleRemoveStudentAfterLock = async (studentId: string) => {
    if (!currentClass) return;
    setAppData(prev => ({ ...prev, classes: { ...prev.classes, [currentClass]: { ...prev.classes[currentClass], students: prev.classes[currentClass].students.map(s => s.Student_ID === studentId ? { ...s, isRemoved: true } : s) } } }));
    try { await updateStudentInDB(currentClass, studentId, { isRemoved: true }); } catch (e) { console.error(e); }
    addNotification({ type: 'warning', message: 'Student marked as removed' });
  };

  const handleEditStudent = async (studentId: string, updatedData: Partial<Student>) => {
    if (!currentClass) return;
    setAppData(prev => ({ ...prev, classes: { ...prev.classes, [currentClass]: { ...prev.classes[currentClass], students: prev.classes[currentClass].students.map(s => s.Student_ID === studentId ? { ...s, ...updatedData } : s) } } }));
    try { await updateStudentInDB(currentClass, studentId, updatedData); } catch (e) { console.error(e); }
  };

  const handleSaveAndLock = async (password: string) => {
    if (!currentClass || !currentClassData) return;
    if (currentClassData.students.length === 0) { addNotification({ type: 'error', message: 'Add at least one student!' }); return; }
    setAppData(prev => ({ ...prev, classes: { ...prev.classes, [currentClass]: { ...prev.classes[currentClass], isLocked: true, password } }, currentView: 'dashboard' }));
    try { await updateClassMetaInDB(currentClass, { isLocked: true, password }); } catch (e) { console.error(e); }
    addNotification({ type: 'success', message: `Class "${currentClass}" locked!` });
  };

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'od', smsStatus?: 'delivered' | 'failed') => {
    if (!currentClass) return;
    const date = appData.currentDate;
    const record: AttendanceRecord = { Student_ID: studentId, Date: date, Status: status, SMS_Sent: status === 'absent', SMS_Status: smsStatus || (status === 'absent' ? 'pending' : 'delivered') };

    setIsSyncing(true);

    // CRITICAL FIX: Compute the updated student INSIDE the state updater to avoid stale closure.
    // We capture it via a ref so we can use it for the DB write.
    let updatedStudentForDB: ReturnType<typeof Object.assign> | null = null;
    let newMarkedDatesForDB: string[] = [];

    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;

      // Guard: if already marked for this student+date, do nothing
      const alreadyMarked = prevClassData.attendanceRecords.some(
        r => r.Student_ID === studentId && r.Date === date
      );
      if (alreadyMarked) return prev;

      const updatedStudents = prevClassData.students.map(s => {
        if (s.Student_ID !== studentId || s.isRemoved) return s;
        const u = { ...s };
        if (status === 'present') u.Total_Days_Present += 1;
        else if (status === 'absent') { u.Total_Days_Absent += 1; u.Leave_Days += 1; }
        else if (status === 'od') { u.On_Duty_Days += 1; u.Total_Days_Present += 1; }
        u.Zone = calculateZone(u.Total_Days_Absent, u.On_Duty_Days);
        updatedStudentForDB = u; // capture for DB write
        return u;
      });

      newMarkedDatesForDB = prevClassData.attendanceMarkedDates.includes(date)
        ? prevClassData.attendanceMarkedDates
        : [...prevClassData.attendanceMarkedDates, date];

      return {
        ...prev,
        classes: {
          ...prev.classes,
          [currentClass]: {
            ...prevClassData,
            students: updatedStudents,
            attendanceRecords: [...prevClassData.attendanceRecords, record],
            attendanceMarkedDates: newMarkedDatesForDB,
          }
        }
      };
    });

    // DB write happens after state update, using the captured updated student
    try {
      if (updatedStudentForDB) {
        await markAttendanceInDB(currentClass, record, updatedStudentForDB);
        await updateClassMetaInDB(currentClass, { attendanceMarkedDates: newMarkedDatesForDB });
      }
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const handleDateChange = (date: string) => setAppData(prev => ({ ...prev, currentDate: date }));
  const handleViewChange = (view: AppData['currentView']) => setAppData(prev => ({ ...prev, currentView: view }));
  const handleGoToAttendance = () => setAppData(prev => ({ ...prev, currentView: 'attendance' }));

  const handleMarkHoliday = async (date: string, reason: string) => {
    if (!currentClass || !currentClassData) return;
    if (currentClassData.holidayDates?.some(h => h.date === date)) {
      addNotification({ type: 'warning', message: `${date} is already marked as a holiday` });
      return;
    }
    if (currentClassData.attendanceMarkedDates.includes(date)) {
      addNotification({ type: 'warning', message: `Attendance already marked for ${date}. Cannot mark as holiday.` });
      return;
    }
    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;
      const newHolidayDates = [...(prevClassData.holidayDates || []), { date, reason }];
      return { ...prev, classes: { ...prev.classes, [currentClass]: { ...prevClassData, holidayDates: newHolidayDates } } };
    });
    try {
      await addHolidayToDB(currentClass, { date, reason });
    } catch (e) { console.error(e); }
    addNotification({ type: 'info', message: `📅 ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} marked as Holiday` });
  };

  const handleRemoveHoliday = async (date: string) => {
    if (!currentClass || !currentClassData) return;
    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;
      const newHolidayDates = (prevClassData.holidayDates || []).filter(h => h.date !== date);
      return { ...prev, classes: { ...prev.classes, [currentClass]: { ...prevClassData, holidayDates: newHolidayDates } } };
    });
    try {
      await removeHolidayFromDB(currentClass, date);
    } catch (e) { console.error(e); }
    addNotification({ type: 'info', message: `Holiday removed for ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` });
  };

  const handleExportCSV = () => {
    if (!currentClass || !currentClassData) return;
    exportToCSV(currentClassData.students.filter(s => !s.isRemoved), currentClass, currentClassData.totalWorkingDays);
    addNotification({ type: 'success', message: 'CSV exported!' });
  };

  // const _handleDownloadFullStudentData = () => {
  //   if (!currentClass || !currentClassData) return;
  //   downloadFullStudentDataExcel(currentClass, currentClassData);
  //   addNotification({ type: 'success', message: `Full student data downloaded!` });
  // };

  const handleDownloadMonthWise = () => {
    if (!currentClass || !currentClassData) return;
    if (!fromDate || !toDate) { setDateError('Select both dates'); return; }
    if (fromDate > toDate) { setDateError('From date cannot be after To date'); return; }
    setDateError('');
    downloadMonthWiseExcel(currentClass, currentClassData, fromDate, toDate);
    addNotification({ type: 'success', message: 'Month-wise report downloaded!' });
  };

  // const _handleDownloadFullBackup = () => {
  //   downloadFullBackupExcel(appData);
  //   addNotification({ type: 'success', message: 'Full backup downloaded!' });
  // };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Class Selection
  if (!currentClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
        <ClassSelection existingClasses={existingClasses} studentCounts={studentCounts}
          savedClassNames={appData.savedClassNames} onSelectClass={handleSelectClass}
          onAddNewClass={handleAddNewClass} onDeleteClass={handleDeleteClass} />
      </div>
    );
  }

  const activeStudents = currentClassData ? currentClassData.students.filter(s => !s.isRemoved) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleSwitchClass} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{currentClass}</h1>
                <p className="text-xs text-gray-500">
                  {activeStudents.length} students | Working Days: {currentClassData?.attendanceMarkedDates?.length || 0} | Holidays: {currentClassData?.holidayDates?.length || 0}
                  {currentClassData?.isLocked && <span className="ml-2 text-green-600 font-medium">🔒</span>}
                </p>
              </div>
            </div>

            {/* Navigation - Added database tab */}
            {currentClassData?.isLocked && (
              <nav className="flex items-center gap-1">
                {(['dashboard', 'attendance', 'students', 'reports', 'database'] as const).map(view => (
                  <button key={view} onClick={() => handleViewChange(view)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${appData.currentView === view
                      ? view === 'database' ? 'bg-purple-500 text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}>
                    {view === 'database' ? '🗄️ DB' : view}
                  </button>
                ))}
                <button onClick={handleExportCSV} className="ml-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                  📥
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {isSyncing && (
        <div className="bg-blue-500 text-white text-center py-1 text-sm">
          <span className="animate-pulse">⟳ Syncing...</span>
        </div>
      )}

      <main>
        {!currentClassData?.isLocked && (
          <StudentRegistration className={currentClass} existingStudents={currentClassData?.students || []}
            onAddStudent={handleAddStudent} onRemoveStudent={handleRemoveStudentBeforeLock}
            onSaveAndLock={handleSaveAndLock} totalWorkingDays={currentClassData?.totalWorkingDays || 0}
            onSwitchClass={handleSwitchClass} />
        )}

        {currentClassData?.isLocked && appData.currentView === 'dashboard' && (
          <Dashboard className={currentClass} students={activeStudents}
            attendanceRecords={currentClassData.attendanceRecords}
            totalWorkingDays={currentClassData.totalWorkingDays}
            currentDate={appData.currentDate} onGoToAttendance={handleGoToAttendance} />
        )}

        {currentClassData?.isLocked && appData.currentView === 'attendance' && (
          <AttendanceSheet className={currentClass} students={activeStudents}
            attendanceRecords={currentClassData.attendanceRecords}
            currentDate={appData.currentDate} totalWorkingDays={currentClassData.totalWorkingDays}
            onMarkAttendance={handleMarkAttendance} onDateChange={handleDateChange}
            onAddNotification={addNotification} onSwitchClass={handleSwitchClass}
            classPassword={currentClassData.password} onEditStudent={handleEditStudent}
            onRemoveStudent={handleRemoveStudentAfterLock}
            holidayDates={currentClassData.holidayDates || []}
            onMarkHoliday={handleMarkHoliday}
            onRemoveHoliday={handleRemoveHoliday} />
        )}

        {currentClassData?.isLocked && appData.currentView === 'students' && (
          <StudentSection classTitle={currentClass} students={activeStudents} totalWorkingDays={currentClassData.totalWorkingDays} />
        )}

        {/* ===== DATABASE VIEW ===== */}
        {currentClassData?.isLocked && appData.currentView === 'database' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🗄️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Database Inspector</h2>
                  <p className="text-sm text-gray-500">Read-only view of stored data for <strong>{currentClass}</strong></p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Students', value: currentClassData.students.length, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Active Students', value: activeStudents.length, color: 'bg-green-50 text-green-700' },
                  { label: 'Removed Students', value: currentClassData.students.filter(s => s.isRemoved).length, color: 'bg-red-50 text-red-700' },
                  { label: 'Attendance Records', value: currentClassData.attendanceRecords.length, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Days Recorded', value: currentClassData.attendanceMarkedDates.length, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Holidays', value: currentClassData.holidayDates?.length || 0, color: 'bg-orange-50 text-orange-700' },
                  { label: 'Working Days Set', value: currentClassData.totalWorkingDays, color: 'bg-teal-50 text-teal-700' },
                  { label: 'Class Locked', value: currentClassData.isLocked ? 'Yes' : 'No', color: 'bg-gray-50 text-gray-700' },
                ].map(item => (
                  <div key={item.label} className={`p-4 rounded-xl ${item.color}`}>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <div className="text-xs mt-1 opacity-80">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800">👥 Students ({currentClassData.students.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {['#','Student ID','Name','Reg No.','Phone','Present','Absent','OD','Zone','Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentClassData.students.map((s, i) => (
                      <tr key={s.Student_ID} className={`border-b hover:bg-gray-50 ${s.isRemoved ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.Student_ID}</td>
                        <td className="px-3 py-2 font-medium">{s.Student_Name}</td>
                        <td className="px-3 py-2 font-mono">{s.Register_Number}</td>
                        <td className="px-3 py-2">{s.Parent_Phone}</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">{s.Total_Days_Present}</td>
                        <td className="px-3 py-2 text-center text-red-600 font-bold">{s.Total_Days_Absent}</td>
                        <td className="px-3 py-2 text-center text-indigo-600 font-bold">{s.On_Duty_Days}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.Zone === 'red' ? 'bg-red-100 text-red-700' :
                            s.Zone === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            s.Zone === 'green' ? 'bg-green-100 text-green-700' :
                            s.Zone === 'blue-star' ? 'bg-blue-100 text-blue-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>{s.Zone}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.isRemoved ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {s.isRemoved ? '❌ Removed' : '✅ Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Records — last 50 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">📋 Attendance Records (last 50 of {currentClassData.attendanceRecords.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {['#','Student ID','Date','Status','SMS Sent','SMS Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...currentClassData.attendanceRecords]
                      .sort((a, b) => b.Date.localeCompare(a.Date))
                      .slice(0, 50)
                      .map((r, i) => (
                        <tr key={`${r.Student_ID}-${r.Date}`} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.Student_ID}</td>
                          <td className="px-3 py-2">{r.Date}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              r.Status === 'present' ? 'bg-green-100 text-green-700' :
                              r.Status === 'absent' ? 'bg-red-100 text-red-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>{r.Status}</span>
                          </td>
                          <td className="px-3 py-2 text-center">{r.SMS_Sent ? '✅' : '—'}</td>
                          <td className="px-3 py-2 text-xs">{r.SMS_Status}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Holidays */}
            {(currentClassData.holidayDates?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b bg-orange-50">
                  <h3 className="font-semibold text-orange-800">🏖️ Holidays ({currentClassData.holidayDates?.length})</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {currentClassData.holidayDates?.map(h => (
                      <span key={h.date} className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                        📅 {h.date} {h.reason ? `— ${h.reason}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ===== REPORTS VIEW ===== */}
        {currentClassData?.isLocked && appData.currentView === 'reports' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Reports & Downloads</h2>
              <p className="text-gray-500">Download attendance data for <strong>{currentClass}</strong></p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500">
                <span>📅 First Record: <strong>{currentClassData.attendanceMarkedDates.length > 0 ? new Date([...currentClassData.attendanceMarkedDates].sort()[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None'}</strong></span>
                <span>•</span>
                <span>📅 Latest Record: <strong>{currentClassData.attendanceMarkedDates.length > 0 ? new Date([...currentClassData.attendanceMarkedDates].sort().reverse()[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None'}</strong></span>
                <span>•</span>
                <span>👥 Students: <strong>{activeStudents.length}</strong></span>
                <span>•</span>
                <span>📊 Total Days: <strong>{currentClassData.attendanceMarkedDates.length}</strong></span>
              </div>
            </div>

            {/* ===== MONTH-WISE / YEAR-WISE DOWNLOAD ===== */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-600">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  📅 Download Attendance Report
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Choose a time period to download student attendance data with Register No, Name, Class, Present, Absent, OD counts
                </p>
              </div>

              <div className="p-6">
                {/* ===== DYNAMIC DATE BUTTONS ===== */}
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${fromDate === m.from && toDate === m.to
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
                </div>
                {/* Manual Date Picker */}
                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 Or choose custom dates:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">From Date (Start)</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setDateError(''); }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">To Date (End)</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setDateError(''); }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Range Info */}
                {fromDate && toDate && !dateError && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-sm text-blue-700">
                        <strong>📅 Selected Period:</strong>{' '}
                        {new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-blue-600">
                          📊 <strong>{currentClassData.attendanceRecords.filter(r => r.Date >= fromDate && r.Date <= toDate).length}</strong> records
                        </span>
                        <span className="text-blue-600">
                          📅 <strong>{currentClassData.attendanceMarkedDates.filter(d => d >= fromDate && d <= toDate).length}</strong> days
                        </span>
                        <span className="text-blue-600">
                          👥 <strong>{activeStudents.length}</strong> students
                        </span>
                      </div>
                    </div>

                    {/* Duration display */}
                    {(() => {
                      const start = new Date(fromDate);
                      const end = new Date(toDate);
                      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      const years = Math.floor(diffDays / 365);
                      const months = Math.floor((diffDays % 365) / 30);
                      const days = diffDays % 30;

                      let durationText = '';
                      if (years > 0) durationText += `${years} year${years > 1 ? 's' : ''} `;
                      if (months > 0) durationText += `${months} month${months > 1 ? 's' : ''} `;
                      if (days > 0 && years === 0) durationText += `${days} day${days > 1 ? 's' : ''}`;

                      return (
                        <div className="mt-2 text-xs text-blue-500">
                          Duration: <strong>{durationText.trim()}</strong> ({diffDays} days)
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* No records warning */}
                {fromDate && toDate && !dateError && currentClassData.attendanceRecords.filter(r => r.Date >= fromDate && r.Date <= toDate).length === 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                    ⚠️ No attendance records found in this date range. The download will show students but no attendance data for this period.
                  </div>
                )}

                {dateError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    ⚠️ {dateError}
                  </div>
                )}

                {/* What's included */}
                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">📄 What's included in the download:</h4>
                  <ul className="text-sm text-gray-600 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span>
                      <strong>Sheet 1 - Period Summary:</strong> S.No, Register Number, Student Name, Class, Parent Phone, Present/Absent/OD counts for selected period AND overall totals, Attendance %, Zone
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span>
                      <strong>Sheet 2 - Day-by-Day:</strong> P/A/OD for each student on each date in the selected period
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span>
                      <strong>Sheet 3 - Monthly Breakdown:</strong> Present/Absent/OD counts per month within the range
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span>
                      Students below 75% attendance highlighted separately
                    </li>
                  </ul>
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownloadMonthWise}
                  disabled={!fromDate || !toDate}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${fromDate && toDate
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <span className="text-2xl">📥</span>
                  {fromDate && toDate
                    ? `Download Report (${new Date(fromDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} → ${new Date(toDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}) .xlsx`
                    : 'Select Date Range First'}
                </button>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default App;