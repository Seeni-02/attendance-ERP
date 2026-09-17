import React, { useState } from 'react';
import { Student, AttendanceRecord, Notification } from '../types';
import { getZoneInfo, simulateSMS, formatDate, calculateAttendancePercentage } from '../utils/helpers';

interface AttendanceSheetProps {
  className: string;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  currentDate: string;
  totalWorkingDays: number;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'od', smsStatus?: 'delivered' | 'failed') => void;
  onDateChange: (date: string) => void;
  onAddNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  onSwitchClass: () => void;
  // NEW: Edit/Remove handlers
  classPassword?: string;
  onEditStudent: (studentId: string, updatedData: Partial<Student>) => void;
  onRemoveStudent: (studentId: string) => void;
  // Holiday/Working Day
  holidayDates: {date: string, reason: string}[];
  onMarkHoliday: (date: string, reason: string) => void;
  onRemoveHoliday: (date: string) => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  students,
  attendanceRecords,
  currentDate,
  onMarkAttendance,
  onDateChange,
  onAddNotification,
  classPassword,
  onEditStudent,
  onRemoveStudent,
  holidayDates,
  onMarkHoliday,
  onRemoveHoliday,
}) => {
  const [loadingStudent, setLoadingStudent] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'red' | 'yellow' | 'green' | 'blue-star' | 'blue-od'>('all');

  // NEW: Password & Edit/Remove states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'remove';
    student: Student;
  } | null>(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState('');

  // Remove confirmation states
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeStudent, setRemoveStudent] = useState<Student | null>(null);

  // Holiday reason state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [holidayError, setHolidayError] = useState('');


  // Filter out removed students for display
  const activeStudents = students.filter(s => !s.isRemoved);

  const getAttendanceForDate = (studentId: string): AttendanceRecord | undefined => {
    return attendanceRecords.find(r => r.Student_ID === studentId && r.Date === currentDate);
  };

  const todayAttendanceCount = activeStudents.filter(s => getAttendanceForDate(s.Student_ID)).length;

  const handleMark = async (student: Student, status: 'present' | 'absent' | 'od') => {
    const existingRecord = getAttendanceForDate(student.Student_ID);
    if (existingRecord) {
      onAddNotification({ type: 'warning', message: `Attendance already marked for ${student.Student_Name} today` });
      return;
    }

    setLoadingStudent(student.Student_ID);

    if (status === 'absent') {
      const smsSuccess = await simulateSMS();
      onMarkAttendance(student.Student_ID, status, smsSuccess ? 'delivered' : 'failed');
      if (smsSuccess) {
        onAddNotification({ type: 'success', message: `✅ SMS sent to ${student.Parent_Phone} for ${student.Student_Name}'s absence` });
      } else {
        onAddNotification({ type: 'error', message: `❌ SMS failed for ${student.Student_Name}. Please resend manually.` });
      }
    } else {
      onMarkAttendance(student.Student_ID, status);
      onAddNotification({ type: 'success', message: `${status === 'present' ? '✓' : '📋'} Marked ${status.toUpperCase()} for ${student.Student_Name}` });
    }

    setLoadingStudent(null);
  };

  const handleResendSMS = async (student: Student) => {
    setLoadingStudent(student.Student_ID);
    const smsSuccess = await simulateSMS();
    if (smsSuccess) {
      onAddNotification({ type: 'success', message: `✅ SMS resent successfully to ${student.Parent_Phone}` });
    } else {
      onAddNotification({ type: 'error', message: `❌ SMS still failed for ${student.Student_Name}. Try again.` });
    }
    setLoadingStudent(null);
  };

  // ==================== PASSWORD & ACTION HANDLERS ====================

  const requestPasswordForAction = (type: 'edit' | 'remove', student: Student) => {
    if (isAuthenticated) {
      // Already authenticated in this session
      if (type === 'edit') {
        openEditModal(student);
      } else {
        openRemoveConfirm(student);
      }
    } else {
      // Need password
      setPendingAction({ type, student });
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordVerify = () => {
    if (!passwordInput) {
      setPasswordError('Please enter the password');
      return;
    }
    if (passwordInput !== classPassword) {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
      return;
    }

    // Password correct
    setIsAuthenticated(true);
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError('');

    // Execute pending action
    if (pendingAction) {
      if (pendingAction.type === 'edit') {
        openEditModal(pendingAction.student);
      } else {
        openRemoveConfirm(pendingAction.student);
      }
      setPendingAction(null);
    }
  };

  const openEditModal = (student: Student) => {
    setEditStudent(student);
    setEditName(student.Student_Name);
    setEditRegNumber(student.Register_Number);
    setEditPhone(student.Parent_Phone);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    if (!editStudent) return;
    if (!editName.trim()) { setEditError('Name cannot be empty'); return; }
    if (!editRegNumber.trim()) { setEditError('Register number cannot be empty'); return; }
    if (!editPhone.trim() || editPhone.length < 10) { setEditError('Enter valid 10-digit phone'); return; }

    // Check duplicate register number (exclude current student)
    const duplicate = activeStudents.find(s =>
      s.Student_ID !== editStudent.Student_ID && s.Register_Number === editRegNumber.trim()
    );
    if (duplicate) { setEditError('Register number already exists'); return; }

    onEditStudent(editStudent.Student_ID, {
      Student_Name: editName.trim(),
      Register_Number: editRegNumber.trim(),
      Parent_Phone: editPhone.trim()
    });

    setShowEditModal(false);
    setEditStudent(null);
    onAddNotification({ type: 'success', message: `✏️ ${editName.trim()}'s data updated successfully` });
  };

  const openRemoveConfirm = (student: Student) => {
    setRemoveStudent(student);
    setShowRemoveConfirm(true);
  };

  const handleRemoveConfirm = () => {
    if (!removeStudent) return;
    onRemoveStudent(removeStudent.Student_ID);
    setShowRemoveConfirm(false);
    onAddNotification({ type: 'warning', message: `🗑️ ${removeStudent.Student_Name} has been removed from the class` });
    setRemoveStudent(null);
  };

  // ==================== FILTERED STUDENTS ====================

  const filteredStudents = filter === 'all'
    ? activeStudents
    : activeStudents.filter(s => s.Zone === filter);

  const zoneCounts = {
    red: activeStudents.filter(s => s.Zone === 'red').length,
    yellow: activeStudents.filter(s => s.Zone === 'yellow').length,
    green: activeStudents.filter(s => s.Zone === 'green').length,
    'blue-star': activeStudents.filter(s => s.Zone === 'blue-star').length,
    'blue-od': activeStudents.filter(s => s.Zone === 'blue-od').length,
  };

  const isHoliday = holidayDates?.some(h => h.date === currentDate);
  const currentHoliday = holidayDates?.find(h => h.date === currentDate);
  const isAttendanceMarked = attendanceRecords.some(r => r.Date === currentDate);

  return (
    <div className="bg-gray-100">
      {/* Date and Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <input type="date" value={currentDate} onChange={(e) => onDateChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-medium" />

              {/* Working Day / Holiday Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isHoliday) {
                      onRemoveHoliday(currentDate);
                    }
                    // Working day is implicit — attendance marking makes it a working day
                  }}
                  disabled={isAttendanceMarked && !isHoliday}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    isHoliday
                      ? 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700 border border-gray-200'
                      : isAttendanceMarked
                        ? 'bg-green-500 text-white shadow-sm cursor-default'
                        : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                  }`}
                >
                  <span>📋</span>
                  {isAttendanceMarked && !isHoliday ? 'Working Day ✓' : 'Working Day'}
                </button>

                <button
                  onClick={() => setShowHolidayModal(true)}
                  disabled={isHoliday || isAttendanceMarked}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    isHoliday
                      ? 'bg-orange-500 text-white shadow-sm cursor-default'
                      : isAttendanceMarked
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white border border-orange-200'
                  }`}
                >
                  <span>🏖️</span>
                  {isHoliday ? 'Holiday ✓' : 'Holiday'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Auth indicator */}
              {isAuthenticated && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                  🔓 Edit Mode Active
                  <button onClick={() => setIsAuthenticated(false)} className="ml-1 text-green-500 hover:text-green-700">✕</button>
                </span>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-500">Progress</div>
                <div className="text-lg font-bold text-gray-800">{todayAttendanceCount}/{activeStudents.length} Marked</div>
              </div>
              {todayAttendanceCount === activeStudents.length && activeStudents.length > 0 && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ Complete</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Holiday Banner */}
      {isHoliday && (
        <div className="bg-orange-50 border-b border-orange-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
              <span className="text-xl">🏖️</span>
              <span className="font-semibold">
                {new Date(currentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} is marked as a Holiday
              </span>
            </div>
            <button
              onClick={() => onRemoveHoliday(currentDate)}
              className="px-3 py-1.5 bg-orange-200 text-orange-800 rounded-lg text-sm font-medium hover:bg-orange-300 transition-colors"
            >
              ✕ Remove Holiday
            </button>
          </div>
        </div>
      )}

      {/* Zone Summary */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { zone: 'red', label: 'Red Zone', color: 'bg-red-500', count: zoneCounts.red },
            { zone: 'yellow', label: 'Yellow', color: 'bg-yellow-500', count: zoneCounts.yellow },
            { zone: 'green', label: 'Green', color: 'bg-green-500', count: zoneCounts.green },
            { zone: 'blue-star', label: 'Blue Star', color: 'bg-blue-500', count: zoneCounts['blue-star'] },
            { zone: 'blue-od', label: 'On Duty', color: 'bg-indigo-500', count: zoneCounts['blue-od'] },
          ].map(item => (
            <button key={item.zone}
              onClick={() => setFilter(filter === item.zone ? 'all' : item.zone as typeof filter)}
              className={`p-3 rounded-xl transition-all ${
                filter === item.zone ? `${item.color} text-white shadow-lg` : 'bg-white hover:shadow-md'
              }`}>
              <div className={`text-2xl font-bold ${filter === item.zone ? 'text-white' : 'text-gray-800'}`}>{item.count}</div>
              <div className={`text-xs ${filter === item.zone ? 'text-white/80' : 'text-gray-500'}`}>{item.label}</div>
            </button>
          ))}
        </div>

        {filter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Showing: {filter} zone</span>
            <button onClick={() => setFilter('all')} className="text-sm text-blue-600 hover:underline">Clear filter</button>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">📅 Attendance for {formatDate(currentDate)}</h2>
            {!isAuthenticated && classPassword && (
              <button
                onClick={() => { setShowPasswordModal(true); setPendingAction(null); setPasswordInput(''); setPasswordError(''); }}
                className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
              >
                🔐 Unlock Edit Mode
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Register No.</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Zone</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Present</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Absent</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">%</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Mark Attendance</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">SMS Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const todayRecord = getAttendanceForDate(student.Student_ID);
                  const zoneInfo = getZoneInfo(student.Zone);
                  const percentage = calculateAttendancePercentage(student.Total_Days_Present, student.Total_Days_Present + student.Total_Days_Absent);
                  const isLoading = loadingStudent === student.Student_ID;

                  return (
                    <tr key={student.Student_ID} className={`border-b hover:bg-gray-50 ${todayRecord ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{student.Student_Name}</div>
                        <div className="text-xs text-gray-500">{student.Parent_Phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">{student.Register_Number}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${zoneInfo.bgLight} ${zoneInfo.textColor}`}>
                          <span className={`w-2 h-2 rounded-full ${zoneInfo.color} mr-1`}></span>
                          {zoneInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-green-600">{student.Total_Days_Present}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-red-600">{student.Total_Days_Absent}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {todayRecord ? (
                          <div className="flex items-center justify-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              todayRecord.Status === 'present' ? 'bg-green-100 text-green-700' :
                              todayRecord.Status === 'absent' ? 'bg-red-100 text-red-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {todayRecord.Status === 'present' ? '✓ Present' :
                               todayRecord.Status === 'absent' ? '✗ Absent' : '📋 OD'}
                            </span>
                          </div>
                        ) : isLoading ? (
                          <div className="flex justify-center">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleMark(student, 'present')}
                              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm">✓ P</button>
                            <button onClick={() => handleMark(student, 'absent')}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm">✗ A</button>
                            <button onClick={() => handleMark(student, 'od')}
                              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm">OD</button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {todayRecord && todayRecord.Status === 'absent' ? (
                          todayRecord.SMS_Status === 'delivered' ? (
                            <span className="text-green-500 text-xl">✅</span>
                          ) : todayRecord.SMS_Status === 'failed' ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-red-500 text-xl">❌</span>
                              <button onClick={() => handleResendSMS(student)} className="text-xs text-blue-600 hover:underline">Resend</button>
                            </div>
                          ) : <span className="text-gray-400">-</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>

                      {/* NEW: Actions Column */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => requestPasswordForAction('edit', student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => requestPasswordForAction('remove', student)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Student"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-400"><p>No students found</p></div>
          )}
        </div>
      </div>

      {/* ========== PASSWORD VERIFICATION MODAL ========== */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Enter Password</h2>
              <p className="text-gray-500 text-sm mt-1">
                {pendingAction
                  ? `Password required to ${pendingAction.type} student data`
                  : 'Enter password to unlock edit mode'
                }
              </p>
            </div>

            <div className="mb-4">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordVerify(); }}
                placeholder="Enter your password"
                autoFocus
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500
                           focus:outline-none transition-colors text-center text-lg"
              />
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {passwordError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPasswordModal(false); setPendingAction(null); setPasswordInput(''); setPasswordError(''); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordVerify}
                disabled={!passwordInput}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                  passwordInput ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Unlock 🔓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT STUDENT MODAL ========== */}
      {showEditModal && editStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✏️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Edit Student</h2>
              <p className="text-gray-500 text-sm mt-1">Update {editStudent.Student_Name}'s information</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                <input type="text" value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
                <input type="text" value={editRegNumber}
                  onChange={(e) => { setEditRegNumber(e.target.value); setEditError(''); }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                <input type="tel" value={editPhone}
                  onChange={(e) => { setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setEditError(''); }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
              </div>

              {/* Student ID - Read only */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500">Student ID (cannot change): </span>
                <span className="text-sm font-mono text-gray-700">{editStudent.Student_ID}</span>
              </div>
            </div>

            {editError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">{editError}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditStudent(null); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSave}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all">
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== REMOVE CONFIRMATION MODAL ========== */}
      {showRemoveConfirm && removeStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Remove Student</h2>
              <p className="text-gray-500 text-sm mt-2">
                Are you sure you want to remove <strong className="text-red-600">{removeStudent.Student_Name}</strong>?
              </p>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                📋 This student's past attendance records will be kept for reference,
                but they won't appear in future attendance sheets.
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowRemoveConfirm(false); setRemoveStudent(null); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRemoveConfirm}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-md transition-colors">
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSheet;