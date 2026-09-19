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
  markBulkAttendanceInDB,
  clearDateAttendanceFromDB,
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{student.Student_Name}</span>
                        {student.Join_Date && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono font-medium" title={`Joined on ${student.Join_Date}`}>
                            Day 1: {student.Join_Date}
                          </span>
                        )}
                      </div>
                    </td>
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
  const [showCustomRange, setShowCustomRange] = useState(false);

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
    const currentClassData = appData.classes[currentClass];
    if (!currentClassData) return;

    const student = currentClassData.students.find(s => s.Student_ID === studentId);
    if (!student || student.isRemoved) return;

    // Guard: if already marked for this student+date, do nothing
    const alreadyMarked = currentClassData.attendanceRecords.some(
      r => r.Student_ID === studentId && r.Date === date
    );
    if (alreadyMarked) return;

    const record: AttendanceRecord = {
      Student_ID: studentId,
      Date: date,
      Status: status,
      SMS_Sent: status === 'absent',
      SMS_Status: smsStatus || (status === 'absent' ? 'pending' : 'delivered')
    };

    const updatedStudent: Student = { ...student };
    if (status === 'present') updatedStudent.Total_Days_Present += 1;
    else if (status === 'absent') { updatedStudent.Total_Days_Absent += 1; updatedStudent.Leave_Days += 1; }
    else if (status === 'od') { updatedStudent.On_Duty_Days += 1; updatedStudent.Total_Days_Present += 1; }
    updatedStudent.Zone = calculateZone(updatedStudent.Total_Days_Absent, updatedStudent.On_Duty_Days);

    const newMarkedDatesForDB = currentClassData.attendanceMarkedDates.includes(date)
      ? currentClassData.attendanceMarkedDates
      : [...currentClassData.attendanceMarkedDates, date];

    setIsSyncing(true);

    // 1. Update React state immediately
    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;

      return {
        ...prev,
        classes: {
          ...prev.classes,
          [currentClass]: {
            ...prevClassData,
            students: prevClassData.students.map(s => s.Student_ID === studentId ? updatedStudent : s),
            attendanceRecords: [...prevClassData.attendanceRecords.filter(r => !(r.Student_ID === studentId && r.Date === date)), record],
            attendanceMarkedDates: prevClassData.attendanceMarkedDates.includes(date)
              ? prevClassData.attendanceMarkedDates
              : [...prevClassData.attendanceMarkedDates, date],
          }
        }
      };
    });

    // 2. Persist to Supabase immediately and await it
    try {
      await markAttendanceInDB(currentClass, record, updatedStudent);
      await updateClassMetaInDB(currentClass, { attendanceMarkedDates: newMarkedDatesForDB });
    } catch (e) {
      console.error('Error saving attendance to Supabase:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMarkBulkAttendance = async (records: AttendanceRecord[], updatedStudents: Student[]) => {
    if (!currentClass || records.length === 0) return;
    const date = appData.currentDate;
    setIsSyncing(true);

    let newMarkedDatesForDB: string[] = [];

    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;

      const updatedStudentMap = new Map(updatedStudents.map(s => [s.Student_ID, s]));
      const nextStudents = prevClassData.students.map(s => updatedStudentMap.get(s.Student_ID) || s);

      newMarkedDatesForDB = prevClassData.attendanceMarkedDates.includes(date)
        ? prevClassData.attendanceMarkedDates
        : [...prevClassData.attendanceMarkedDates, date];

      // DEDUPLICATE: Don't add duplicate records if a record for that student+date already exists in state
      const existingKeySet = new Set(prevClassData.attendanceRecords.map(r => `${r.Student_ID}_${r.Date}`));
      const newRecordsToAdd = records.filter(r => !existingKeySet.has(`${r.Student_ID}_${r.Date}`));

      return {
        ...prev,
        classes: {
          ...prev.classes,
          [currentClass]: {
            ...prevClassData,
            students: nextStudents,
            attendanceRecords: [...prevClassData.attendanceRecords, ...newRecordsToAdd],
            attendanceMarkedDates: newMarkedDatesForDB,
          }
        }
      };
    });

    try {
      await markBulkAttendanceInDB(currentClass, records, updatedStudents, newMarkedDatesForDB);
    } catch (e) {
      console.error('Error saving bulk attendance:', e);
    } finally {
      setIsSyncing(false);
    }
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

    setIsSyncing(true);
    let updatedStudentsForDB: Student[] = [];
    let newMarkedDatesForDB: string[] = [];
    let hadAttendanceRecords = false;

    setAppData(prev => {
      const prevClassData = prev.classes[currentClass];
      if (!prevClassData) return prev;

      const dateRecords = prevClassData.attendanceRecords.filter(r => r.Date === date);
      let updatedStudents = prevClassData.students;

      if (dateRecords.length > 0) {
        hadAttendanceRecords = true;
        const recordMap = new Map(dateRecords.map(r => [r.Student_ID, r]));
        updatedStudents = prevClassData.students.map(s => {
          const rec = recordMap.get(s.Student_ID);
          if (!rec) return s;
          const u = { ...s };
          if (rec.Status === 'present') {
            u.Total_Days_Present = Math.max(0, u.Total_Days_Present - 1);
          } else if (rec.Status === 'absent') {
            u.Total_Days_Absent = Math.max(0, u.Total_Days_Absent - 1);
            u.Leave_Days = Math.max(0, u.Leave_Days - 1);
          } else if (rec.Status === 'od') {
            u.On_Duty_Days = Math.max(0, u.On_Duty_Days - 1);
            u.Total_Days_Present = Math.max(0, u.Total_Days_Present - 1);
          }
          u.Zone = calculateZone(u.Total_Days_Absent, u.On_Duty_Days);
          return u;
        });
      }

      updatedStudentsForDB = updatedStudents;
      newMarkedDatesForDB = prevClassData.attendanceMarkedDates.filter(d => d !== date);
      const newAttendanceRecords = prevClassData.attendanceRecords.filter(r => r.Date !== date);
      const newHolidayDates = [...(prevClassData.holidayDates || []), { date, reason }];

      return {
        ...prev,
        classes: {
          ...prev.classes,
          [currentClass]: {
            ...prevClassData,
            students: updatedStudents,
            attendanceRecords: newAttendanceRecords,
            attendanceMarkedDates: newMarkedDatesForDB,
            holidayDates: newHolidayDates
          }
        }
      };
    });

    try {
      if (hadAttendanceRecords) {
        await clearDateAttendanceFromDB(currentClass, date, updatedStudentsForDB, newMarkedDatesForDB);
      }
      await addHolidayToDB(currentClass, { date, reason });
    } catch (e) {
      console.error(e);
    }
    setIsSyncing(false);
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

  const handleDownloadSpecificRange = (from: string, to: string, label: string) => {
    if (!currentClass || !currentClassData) return;
    downloadMonthWiseExcel(currentClass, currentClassData, from, to);
    addNotification({ type: 'success', message: `📥 ${label} report downloaded successfully!` });
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
            onMarkAttendance={handleMarkAttendance}
            onMarkBulkAttendance={handleMarkBulkAttendance}
            onDateChange={handleDateChange}
            onAddNotification={addNotification} onSwitchClass={handleSwitchClass}
            classPassword={currentClassData.password} onEditStudent={handleEditStudent}
            onRemoveStudent={handleRemoveStudentAfterLock}
            onAddStudent={handleAddStudent}
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
                  <p className="text-sm text-gray-500">Live Supabase data view for <strong>{currentClass}</strong></p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-2">
                {[
                  { label: 'Total Students', value: currentClassData.students.length, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Active Students', value: activeStudents.length, color: 'bg-green-50 text-green-700' },
                  { label: 'Removed Students', value: currentClassData.students.filter(s => s.isRemoved).length, color: 'bg-red-50 text-red-700' },
                  { label: 'Days Recorded', value: currentClassData.attendanceMarkedDates.length, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Holidays', value: currentClassData.holidayDates?.length || 0, color: 'bg-orange-50 text-orange-700' },
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

            {/* Holidays Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
                <h3 className="font-semibold text-orange-800">🏖️ Holidays ({currentClassData.holidayDates?.length || 0})</h3>
              </div>
              <div className="p-4">
                {(currentClassData.holidayDates?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-400 italic">No holidays marked for this class yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-orange-50/50 border-b border-orange-100">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-orange-800">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-orange-800">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-orange-800">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentClassData.holidayDates?.map((h, i) => (
                          <tr key={h.date} className="border-b border-gray-100 hover:bg-orange-50/30">
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">📅 {h.date}</td>
                            <td className="px-3 py-2 text-gray-600">{h.reason || 'Holiday'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== REPORTS VIEW ===== */}
        {currentClassData?.isLocked && appData.currentView === 'reports' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Reports & Downloads</h2>
              <p className="text-gray-500">Download attendance data for <strong>{currentClass}</strong></p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                <span>📅 First Record: <strong>{currentClassData.attendanceMarkedDates.length > 0 ? new Date([...currentClassData.attendanceMarkedDates].sort()[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None'}</strong></span>
                <span>•</span>
                <span>📅 Latest Record: <strong>{currentClassData.attendanceMarkedDates.length > 0 ? new Date([...currentClassData.attendanceMarkedDates].sort().reverse()[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None'}</strong></span>
                <span>•</span>
                <span>👥 Students: <strong>{activeStudents.length}</strong></span>
                <span>•</span>
                <span>📊 Total Days: <strong>{currentClassData.attendanceMarkedDates.length}</strong></span>
              </div>
            </div>

            {/* ===== ALL-TIME COMPLETE REPORT ===== */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    📚 Complete Attendance History (All Time)
                  </h3>
                  <p className="text-emerald-100 text-sm mt-1">
                    Download complete attendance records from the very first recorded day to the latest.
                  </p>
                </div>
                {currentClassData.attendanceMarkedDates.length > 0 && (
                  <button
                    onClick={() => {
                      const sorted = [...currentClassData.attendanceMarkedDates].sort();
                      handleDownloadSpecificRange(sorted[0], sorted[sorted.length - 1], 'All-Time');
                    }}
                    className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
                  >
                    <span>📥</span>
                    <span>Download All-Time Report (.xlsx)</span>
                  </button>
                )}
              </div>
            </div>

            {/* ===== 3. CUSTOM DATE RANGE (COLLAPSIBLE) ===== */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <button
                onClick={() => setShowCustomRange(!showCustomRange)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <span className="font-bold text-gray-800">Custom Date Range</span>
                  <span className="text-xs text-gray-500">(Click to choose custom start & end dates)</span>
                </div>
                <span className="text-gray-400 font-bold">{showCustomRange ? '▲ Close' : '▼ Expand'}</span>
              </button>

              {showCustomRange && (
                <div className="p-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">From Date (Start)</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setDateError(''); }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">To Date (End)</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setDateError(''); }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base"
                      />
                    </div>
                  </div>

                  {dateError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      ⚠️ {dateError}
                    </div>
                  )}

                  <button
                    onClick={handleDownloadMonthWise}
                    disabled={!fromDate || !toDate}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                      fromDate && toDate
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>📥</span>
                    <span>Download Custom Range Report (.xlsx)</span>
                  </button>
                </div>
              )}
            </div>

            {/* What's included card */}
            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
              <h4 className="font-semibold text-gray-800 mb-2.5 flex items-center gap-2">
                <span>📄</span> What's included in every Excel report:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <strong>Sheet 1 - Period Summary:</strong> Register Number, Student Name, Class, Present/Absent/OD counts for selected period, Attendance %, and Zone
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <strong>Sheet 2 - Day-by-Day:</strong> Detailed P / A / OD record for each student on every recorded day
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <strong>Sheet 3 - Monthly Breakdown:</strong> Month-by-month attendance totals and percentages
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <strong>Sheet 4 - Holidays:</strong> Complete list of marked holidays during the period
                </li>
              </ul>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default App;