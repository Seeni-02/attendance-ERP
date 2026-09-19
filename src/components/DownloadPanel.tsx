import React from 'react';
import { Student, AttendanceRecord } from '../types';
import { exportToCSV } from '../utils/helpers';

interface DownloadPanelProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  className: 'CS-A' | 'CS-B';
  onClose: () => void;
  isFullPage?: boolean;
}

const DownloadPanel: React.FC<DownloadPanelProps> = ({ students, attendanceRecords, className, onClose, isFullPage = false }) => {
  
  const handleDownloadStudents = () => {
    if (students.length === 0) {
      alert('No student data to download');
      return;
    }
    exportToCSV(students, `${className}_Students_${new Date().toISOString().split('T')[0]}`);
  };

  const handleDownloadByZone = (zone: string) => {
    const filtered = students.filter(s => s.Zone === zone);
    if (filtered.length === 0) {
      alert(`No students in ${zone} zone`);
      return;
    }
    exportToCSV(filtered, `${className}_${zone}_Zone_${new Date().toISOString().split('T')[0]}`);
  };

  const handleDownloadAttendance = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records to download');
      return;
    }
    
    const headers = ['Student_ID', 'Date', 'Status', 'SMS_Sent', 'SMS_Status'];
    const rows = attendanceRecords.map(r => [
      r.Student_ID,
      r.Date,
      r.Status,
      r.SMS_Sent ? 'Yes' : 'No',
      r.SMS_Status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className}_Attendance_Records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isFullPage) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">📥 Download Reports - {className}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* All Students */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📊</span>
                <div>
                  <h3 className="font-semibold text-gray-800">All Students Data</h3>
                  <p className="text-sm text-gray-500">{students.length} students with attendance summary</p>
                </div>
              </div>
              <button
                onClick={handleDownloadStudents}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Download CSV
              </button>
            </div>

            {/* Attendance Records */}
            <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📅</span>
                <div>
                  <h3 className="font-semibold text-gray-800">Attendance Records</h3>
                  <p className="text-sm text-gray-500">{attendanceRecords.length} daily attendance records</p>
                </div>
              </div>
              <button
                onClick={handleDownloadAttendance}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Download CSV
              </button>
            </div>
          </div>

          {/* Zone-wise Downloads */}
          <div className="mt-6 p-6 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-4">🎯 Download by Zone</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleDownloadByZone('red')}
                className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                🔴 Red Zone ({students.filter(s => s.Zone === 'red').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('yellow')}
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                🟡 Yellow ({students.filter(s => s.Zone === 'yellow').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('green')}
                className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                🟢 Green ({students.filter(s => s.Zone === 'green').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('blue-star')}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ⭐ Blue Star ({students.filter(s => s.Zone === 'blue-star').length})
              </button>
            </div>
          </div>

          {/* Data Info */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <p><strong>Note:</strong> All downloads are in CSV format which can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">📥 Download Data - {className}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* All Students */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">All Students Data</h3>
                <p className="text-sm text-gray-500">{students.length} students with attendance summary</p>
              </div>
              <button
                onClick={handleDownloadStudents}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download CSV
              </button>
            </div>
          </div>

          {/* By Zone */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Download by Zone</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownloadByZone('red')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                🔴 Red Zone ({students.filter(s => s.Zone === 'red').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('yellow')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
              >
                🟡 Yellow Zone ({students.filter(s => s.Zone === 'yellow').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('green')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                🟢 Green Zone ({students.filter(s => s.Zone === 'green').length})
              </button>
              <button
                onClick={() => handleDownloadByZone('blue-star')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                ⭐ Blue Star ({students.filter(s => s.Zone === 'blue-star').length})
              </button>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Attendance Records</h3>
                <p className="text-sm text-gray-500">{attendanceRecords.length} records with dates</p>
              </div>
              <button
                onClick={handleDownloadAttendance}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadPanel;
