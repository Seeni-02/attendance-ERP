import React, { useState } from 'react';
import { Student, AttendanceRecord } from '../types';
import { formatDate } from '../utils/helpers';

interface DashboardProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  totalWorkingDays: number;
  currentDate: string;
  className: string;
  onGoToAttendance: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  students,
  attendanceRecords,
  totalWorkingDays,
  currentDate,
  className,
  onGoToAttendance
}) => {
  // NEW: History states
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  const zoneCounts = {
    red: students.filter(s => s.Zone === 'red').length,
    yellow: students.filter(s => s.Zone === 'yellow').length,
    green: students.filter(s => s.Zone === 'green').length,
    'blue-star': students.filter(s => s.Zone === 'blue-star').length,
    'blue-od': students.filter(s => s.Zone === 'blue-od').length,
  };

  const todayRecords = attendanceRecords.filter(r => r.Date === currentDate);
  const todaySMSDelivered = todayRecords.filter(r => r.SMS_Status === 'delivered').length;
  const todaySMSFailed = todayRecords.filter(r => r.SMS_Status === 'failed').length;
  const todayAbsent = todayRecords.filter(r => r.Status === 'absent').length;
  const todayMarkedCount = todayRecords.length;
  const attendanceComplete = todayMarkedCount === students.length;

  const totalPresent = students.reduce((sum, s) => sum + s.Total_Days_Present, 0);
  const totalAbsent = students.reduce((sum, s) => sum + s.Total_Days_Absent, 0);
  const overallPercentage = students.length > 0 && (totalPresent + totalAbsent) > 0
    ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 100;

  // All unique dates sorted (newest first)
  const uniqueDates = [...new Set(attendanceRecords.map(r => r.Date))].sort().reverse();
  
  const getMonthStr = (date: string) => date.substring(0, 7);
  const getMonthDisplay = (monthStr: string) => {
    const d = new Date(monthStr + '-01');
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
  };

  const datesByMonth: Record<string, string[]> = {};
  uniqueDates.forEach(date => {
    const m = getMonthStr(date);
    if (!datesByMonth[m]) datesByMonth[m] = [];
    datesByMonth[m].push(date);
  });

  const uniqueMonths = Object.keys(datesByMonth).sort().reverse();

  // Get detailed records for selected date
  const getDateDetails = (date: string) => {
    const dateRecords = attendanceRecords.filter(r => r.Date === date);

    const presentStudents: { student: Student; record: AttendanceRecord }[] = [];
    const absentStudents: { student: Student; record: AttendanceRecord }[] = [];
    const odStudents: { student: Student; record: AttendanceRecord }[] = [];

    dateRecords.forEach(record => {
      const student = students.find(s => s.Student_ID === record.Student_ID);
      if (!student) return;

      if (record.Status === 'present') {
        presentStudents.push({ student, record });
      } else if (record.Status === 'absent') {
        absentStudents.push({ student, record });
      } else if (record.Status === 'od') {
        odStudents.push({ student, record });
      }
    });

    return { presentStudents, absentStudents, odStudents, total: dateRecords.length };
  };

  const selectedDateDetails = selectedHistoryDate ? getDateDetails(selectedHistoryDate) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Quick Actions Banner */}
      {!attendanceComplete && students.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">📋 Mark Today's Attendance</h3>
            <p className="text-white/80 text-sm">{todayMarkedCount}/{students.length} students marked for {formatDate(currentDate)}</p>
          </div>
          <button onClick={onGoToAttendance}
            className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Mark Attendance →
          </button>
        </div>
      )}

      {attendanceComplete && students.length > 0 && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h3 className="font-bold text-green-800">Attendance Complete!</h3>
              <p className="text-green-600 text-sm">All {students.length} students marked for {formatDate(currentDate)}</p>
            </div>
          </div>
          <button onClick={onGoToAttendance}
            className="px-4 py-2 text-green-700 border border-green-400 rounded-lg hover:bg-green-200 transition-colors">
            View Details
          </button>
        </div>
      )}

      {/* Zone Summary Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🎯 Zone Classification</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { zone: 'red', label: 'Red Zone', color: 'bg-red-500', lightColor: 'bg-red-50', textColor: 'text-red-700', desc: '> 30 days leave' },
            { zone: 'yellow', label: 'Yellow Zone', color: 'bg-yellow-500', lightColor: 'bg-yellow-50', textColor: 'text-yellow-700', desc: '10-30 days leave' },
            { zone: 'green', label: 'Green Zone', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700', desc: '< 10 days leave' },
            { zone: 'blue-star', label: 'Blue Star ⭐', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700', desc: 'Perfect Attendance' },
            { zone: 'blue-od', label: 'On Duty', color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-700', desc: 'OD Students' },
          ].map(item => (
            <div key={item.zone} className={`p-4 rounded-xl ${item.lightColor} border-l-4 ${item.color.replace('bg-', 'border-')}`}>
              <div className={`text-3xl font-bold ${item.textColor}`}>{zoneCounts[item.zone as keyof typeof zoneCounts]}</div>
              <div className={`text-sm font-medium ${item.textColor}`}>{item.label}</div>
              <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Overall Attendance</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-4xl font-bold text-gray-800">{overallPercentage}%</div>
              <div className="text-sm text-gray-500">Class Average</div>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              overallPercentage >= 75 ? 'bg-green-100 text-green-600' :
              overallPercentage >= 50 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
            }`}>
              <span className="text-2xl">{overallPercentage >= 75 ? '😊' : overallPercentage >= 50 ? '😐' : '😟'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span><span>Present: {totalPresent}</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span><span>Absent: {totalAbsent}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Today's SMS Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-gray-600">Absent Today</span><span className="font-bold text-red-600">{todayAbsent}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">✅ SMS Delivered</span><span className="font-bold text-green-600">{todaySMSDelivered}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">❌ SMS Failed</span><span className="font-bold text-red-600">{todaySMSFailed}</span></div>
          </div>
          {todaySMSFailed > 0 && (
            <div className="mt-4 p-2 bg-red-50 rounded-lg text-sm text-red-600">⚠️ {todaySMSFailed} SMS failed - check attendance sheet</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Class Info - {className}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-gray-600">Total Students</span><span className="font-bold text-gray-800">{students.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Working Days</span><span className="font-bold text-gray-800">{totalWorkingDays}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Days Recorded</span><span className="font-bold text-gray-800">{uniqueDates.length}</span></div>
          </div>
        </div>
      </div>

      {/* Red Zone Alert */}
      {zoneCounts.red > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h3 className="font-bold text-red-800 mb-2">🚨 Attention Required</h3>
          <p className="text-red-600 text-sm mb-3">{zoneCounts.red} student(s) in Red Zone with more than 30 days leave:</p>
          <div className="flex flex-wrap gap-2">
            {students.filter(s => s.Zone === 'red').map(student => (
              <span key={student.Student_ID} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                {student.Student_Name} ({student.Leave_Days} days)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* ========== ATTENDANCE HISTORY BUTTON ========== */}
      {/* ============================================= */}
      {uniqueDates.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => { setShowHistory(!showHistory); setSelectedHistoryMonth(null); setSelectedHistoryDate(null); }}
            className={`w-full p-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-between ${
              showHistory
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-800 shadow-lg hover:shadow-xl hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div className="text-left">
                <div className="text-lg font-bold">Attendance History</div>
                <div className={`text-sm ${showHistory ? 'text-blue-100' : 'text-gray-500'}`}>
                  {uniqueDates.length} day{uniqueDates.length > 1 ? 's' : ''} recorded • Click to {showHistory ? 'hide' : 'view'}
                </div>
              </div>
            </div>
            <div className={`transform transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* ========== EXPANDED HISTORY PANEL ========== */}
          {showHistory && (
            <div className="mt-3 bg-white rounded-xl shadow-lg overflow-hidden animate-fadeIn">
              <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
                {selectedHistoryMonth && (
                  <button 
                    onClick={() => { setSelectedHistoryMonth(null); setSelectedHistoryDate(null); }}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold flex items-center gap-1"
                  >
                    <span>←</span> Back
                  </button>
                )}
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {selectedHistoryMonth ? `Dates in ${getMonthDisplay(selectedHistoryMonth)}` : 'Select a month to view details'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedHistoryMonth ? 'Click on any date below to see who was present, absent, or on duty' : 'Click on a month to view its attendance records'}
                  </p>
                </div>
              </div>

              {/* Month / Date List */}
              <div className="p-4">
                {!selectedHistoryMonth ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {uniqueMonths.map(month => (
                      <button
                        key={month}
                        onClick={() => setSelectedHistoryMonth(month)}
                        className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="text-lg font-bold text-gray-800 group-hover:text-blue-700">{getMonthDisplay(month)}</div>
                        <div className="text-xs text-gray-500 mt-1">{datesByMonth[month].length} working day(s)</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {datesByMonth[selectedHistoryMonth].map(date => {
                      const dateRecords = attendanceRecords.filter(r => r.Date === date);
                      const presentCount = dateRecords.filter(r => r.Status === 'present').length;
                      const absentCount = dateRecords.filter(r => r.Status === 'absent').length;
                      const odCount = dateRecords.filter(r => r.Status === 'od').length;
                      const isSelected = selectedHistoryDate === date;

                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedHistoryDate(isSelected ? null : date)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                            {formatDate(date)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-green-700 font-medium">{presentCount}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              <span className="text-red-700 font-medium">{absentCount}</span>
                            </span>
                            {odCount > 0 && (
                              <span className="flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                <span className="text-indigo-700 font-medium">{odCount}</span>
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========== SELECTED DATE DETAILS ========== */}
              {selectedHistoryDate && selectedDateDetails && (
                <div className="border-t">
                  {/* Date Header */}
                  <div className="p-4 bg-blue-50 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-blue-800">
                        📋 {formatDate(selectedHistoryDate)}
                        <span className="text-sm font-normal text-blue-600 ml-2">
                          ({new Date(selectedHistoryDate).toLocaleDateString('en-IN', { weekday: 'long' })})
                        </span>
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Total: {selectedDateDetails.total} marked •
                        <span className="text-green-700"> {selectedDateDetails.presentStudents.length} Present</span> •
                        <span className="text-red-700"> {selectedDateDetails.absentStudents.length} Absent</span>
                        {selectedDateDetails.odStudents.length > 0 && (
                          <span className="text-indigo-700"> • {selectedDateDetails.odStudents.length} OD</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedHistoryDate(null)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* ===== PRESENT STUDENTS TABLE ===== */}
                  {selectedDateDetails.presentStudents.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <h4 className="font-semibold text-green-800">
                          Present Students ({selectedDateDetails.presentStudents.length})
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-green-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-green-50">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 border-b border-green-200">#</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 border-b border-green-200">Student Name</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 border-b border-green-200">Register No.</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 border-b border-green-200">Phone</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-green-700 border-b border-green-200">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDateDetails.presentStudents.map(({ student }, idx) => (
                              <tr key={student.Student_ID} className="hover:bg-green-50 border-b border-green-100 last:border-b-0">
                                <td className="px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-800">{student.Student_Name}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">{student.Register_Number}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{student.Parent_Phone}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    ✓ Present
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ===== ABSENT STUDENTS TABLE ===== */}
                  {selectedDateDetails.absentStudents.length > 0 && (
                    <div className="p-4 bg-red-50/30">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <h4 className="font-semibold text-red-800">
                          Absent Students ({selectedDateDetails.absentStudents.length})
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-red-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-red-50">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-red-700 border-b border-red-200">#</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-red-700 border-b border-red-200">Student Name</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-red-700 border-b border-red-200">Register No.</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-red-700 border-b border-red-200">Parent Phone</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-red-700 border-b border-red-200">Status</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-red-700 border-b border-red-200">SMS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDateDetails.absentStudents.map(({ student, record }, idx) => (
                              <tr key={student.Student_ID} className="hover:bg-red-50 border-b border-red-100 last:border-b-0">
                                <td className="px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-800">{student.Student_Name}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">{student.Register_Number}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{student.Parent_Phone}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    ✗ Absent
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {record.SMS_Status === 'delivered' ? (
                                    <span className="text-green-500 text-sm" title="SMS Delivered">✅</span>
                                  ) : record.SMS_Status === 'failed' ? (
                                    <span className="text-red-500 text-sm" title="SMS Failed">❌</span>
                                  ) : (
                                    <span className="text-gray-400 text-sm" title="Pending">⏳</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ===== OD STUDENTS TABLE ===== */}
                  {selectedDateDetails.odStudents.length > 0 && (
                    <div className="p-4 bg-indigo-50/30">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                        <h4 className="font-semibold text-indigo-800">
                          On Duty Students ({selectedDateDetails.odStudents.length})
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-indigo-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-indigo-50">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 border-b border-indigo-200">#</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 border-b border-indigo-200">Student Name</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 border-b border-indigo-200">Register No.</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 border-b border-indigo-200">Phone</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-indigo-700 border-b border-indigo-200">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDateDetails.odStudents.map(({ student }, idx) => (
                              <tr key={student.Student_ID} className="hover:bg-indigo-50 border-b border-indigo-100 last:border-b-0">
                                <td className="px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-800">{student.Student_Name}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">{student.Register_Number}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{student.Parent_Phone}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                    📋 On Duty
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary Footer */}
                  <div className="p-4 bg-gray-50 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          Present: <strong className="text-green-700">{selectedDateDetails.presentStudents.length}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                          Absent: <strong className="text-red-700">{selectedDateDetails.absentStudents.length}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                          OD: <strong className="text-indigo-700">{selectedDateDetails.odStudents.length}</strong>
                        </span>
                      </div>
                      <div className="text-gray-500">
                        Attendance Rate: <strong className={`${
                          ((selectedDateDetails.presentStudents.length + selectedDateDetails.odStudents.length) / Math.max(selectedDateDetails.total, 1)) * 100 >= 75
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round(((selectedDateDetails.presentStudents.length + selectedDateDetails.odStudents.length) / Math.max(selectedDateDetails.total, 1)) * 100)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Students Yet</h3>
          <p className="text-gray-500">Add students to start tracking attendance</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;