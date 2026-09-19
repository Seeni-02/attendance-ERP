import { Student, ZoneType, AppData, ClassData, AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';

// Calculate zone based on leave days
export const calculateZone = (leaveDays: number, onDutyDays: number): ZoneType => {
  if (onDutyDays > 0 && leaveDays === 0) return 'blue-od';
  if (leaveDays === 0) return 'blue-star';
  if (leaveDays < 10) return 'green';
  if (leaveDays <= 30) return 'yellow';
  return 'red';
};

// Get zone display info
export const getZoneInfo = (zone: ZoneType) => {
  const zones = {
    'red': { label: 'Red Zone', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-100', description: '> 30 days leave - Critical' },
    'yellow': { label: 'Yellow Zone', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-100', description: '10-30 days leave - Warning' },
    'green': { label: 'Green Zone', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100', description: '< 10 days leave - Good' },
    'blue-star': { label: 'Blue Star', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-100', description: '0 days leave - Perfect' },
    'blue-od': { label: 'Blue (OD)', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-100', description: 'On Duty' }
  };
  return zones[zone];
};

// Generate unique student ID
export const generateStudentId = (className: string = 'STU', index: number = 0): string => {
  const year = new Date().getFullYear();
  return `${className}-${year}-${String(index + 1).padStart(3, '0')}`;
};

// Format date
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Simulate SMS sending (70% success rate)
export const simulateSMS = (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() > 0.3);
    }, 500);
  });
};

// Calculate attendance percentage
export const calculateAttendancePercentage = (present: number, totalDays: number): number => {
  if (totalDays === 0) return 100;
  return Math.round((present / totalDays) * 100);
};

// Initial empty class data
export const createEmptyClassData = (): ClassData => ({
  students: [],
  attendanceRecords: [],
  isLocked: false,
  totalWorkingDays: 0,
  createdDate: getTodayDate(),
  attendanceMarkedDates: [],
  holidayDates: []
});

// Initial app data
export const createInitialAppData = (): AppData => ({
  classes: {},
  savedClassNames: [],
  currentClass: null,
  currentDate: getTodayDate(),
  currentView: 'dashboard'
});

// Local storage is no longer used, we completely rely on Supabase

// ============================================
// Export to CSV - Basic export
// ============================================
export const exportToCSV = (students: Student[], filename: string, totalWorkingDays: number = 0): void => {
  const headers = [
    'Student_Name',
    'Register_Number',
    'Class',
    'Parent_Phone',
    'Join_Date',
    'Total_Days_Present',
    'Total_Days_Absent',
    'OD_Days',
    'Attendance_%',
    'Zone'
  ];

  const rows = students.map(s => {
    const totalDaysRecorded = s.Total_Days_Present + s.Total_Days_Absent;
    const totalDays = totalDaysRecorded > 0 ? totalDaysRecorded : (totalWorkingDays > 0 ? totalWorkingDays : 0);
    const presentFormatted = `${s.Total_Days_Present} / ${totalDays}`;
    const pct = totalDays > 0 ? Math.round((s.Total_Days_Present / totalDays) * 100) : 100;

    return [
      `"${s.Student_Name}"`,
      s.Register_Number,
      s.Class,
      s.Parent_Phone,
      s.Join_Date || '-',
      `"${presentFormatted}"`,
      s.Total_Days_Absent,
      s.On_Duty_Days,
      `"${pct}%"`,
      s.Zone
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================
// Helper: Get month name from number
// ============================================
const getMonthName = (month: number): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month] || '';
};

// ============================================
// Helper: Filter records by date range
// ============================================
const filterRecordsByDateRange = (
  records: AttendanceRecord[],
  fromDate: string,
  toDate: string
): AttendanceRecord[] => {
  return records.filter(r => r.Date >= fromDate && r.Date <= toDate);
};

// ============================================
// Helper: Calculate student stats from records
// ============================================
const calculateStudentStats = (
  studentId: string,
  records: AttendanceRecord[]
): { present: number; absent: number; od: number } => {
  const studentRecords = records.filter(r => r.Student_ID === studentId);
  return {
    present: studentRecords.filter(r => r.Status === 'present').length,
    absent: studentRecords.filter(r => r.Status === 'absent').length,
    od: studentRecords.filter(r => r.Status === 'od').length,
  };
};

// ============================================
// FULL STUDENT DATA DOWNLOAD (No month filter)
// All student data with complete attendance
// ============================================
export const downloadFullStudentDataExcel = (
  className: string,
  classData: ClassData
): void => {
  const workbook = XLSX.utils.book_new();
  const today = getTodayDate();
  const activeStudents = classData.students.filter(s => !s.isRemoved);
  const dates = [...classData.attendanceMarkedDates].sort();

  // ===== SHEET 1: STUDENT COMPLETE DATA =====
  const studentData: (string | number)[][] = [];

  studentData.push([`📋 ${className} - Complete Student Attendance Data`]);
  studentData.push([`Generated: ${formatDate(today)}`]);
  studentData.push([`Total Students: ${activeStudents.length} | Total Working Days: ${classData.totalWorkingDays} | Days Recorded: ${dates.length} | Total Holidays: ${classData.holidayDates?.length || 0}`]);
  studentData.push([]);

  // Header
  studentData.push([
    'S.No',
    'Register Number',
    'Student Name',
    'Class',
    'Parent Phone',
    'Total Days Present',
    'Total Days Absent',
    'OD Days',
    'Holidays',
    'Total Days Recorded',
    'Attendance %',
    'Zone'
  ]);

  // Student rows
  activeStudents.forEach((student, index) => {
    const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
    const percentage = totalDays > 0
      ? Math.round((student.Total_Days_Present / totalDays) * 100)
      : 100;

    studentData.push([
      index + 1,
      student.Register_Number,
      student.Student_Name,
      student.Class,
      student.Parent_Phone,
      student.Total_Days_Present,
      student.Total_Days_Absent,
      student.On_Duty_Days,
      classData.holidayDates?.length || 0,
      totalDays,
      `${percentage}%`,
      student.Zone
    ]);
  });

  // Totals row
  studentData.push([]);
  const totalPresent = activeStudents.reduce((sum, s) => sum + s.Total_Days_Present, 0);
  const totalAbsent = activeStudents.reduce((sum, s) => sum + s.Total_Days_Absent, 0);
  const totalOD = activeStudents.reduce((sum, s) => sum + s.On_Duty_Days, 0);
  const avgPercentage = activeStudents.length > 0
    ? Math.round(activeStudents.reduce((sum, s) => {
        const td = s.Total_Days_Present + s.Total_Days_Absent;
        return sum + (td > 0 ? Math.round((s.Total_Days_Present / td) * 100) : 100);
      }, 0) / activeStudents.length)
    : 0;

  studentData.push([
    '', '', 'TOTAL / AVERAGE', '', '',
    totalPresent, totalAbsent, totalOD,
    (classData.holidayDates?.length || 0),
    totalPresent + totalAbsent,
    `${avgPercentage}% (avg)`,
    ''
  ]);

  // Zone summary
  studentData.push([]);
  studentData.push(['ZONE SUMMARY']);
  studentData.push([
    'Red Zone (>30 days absent):', activeStudents.filter(s => s.Zone === 'red').length,
    '', 'Yellow Zone (10-30 days):', activeStudents.filter(s => s.Zone === 'yellow').length,
    '', 'Green Zone (<10 days):', activeStudents.filter(s => s.Zone === 'green').length
  ]);
  studentData.push([
    'Blue Star (Perfect):', activeStudents.filter(s => s.Zone === 'blue-star').length,
    '', 'Blue OD:', activeStudents.filter(s => s.Zone === 'blue-od').length
  ]);

  // Students below 75%
  const belowThreshold = activeStudents.filter(s => {
    const td = s.Total_Days_Present + s.Total_Days_Absent;
    const pct = td > 0 ? Math.round((s.Total_Days_Present / td) * 100) : 100;
    return pct < 75;
  });

  if (belowThreshold.length > 0) {
    studentData.push([]);
    studentData.push(['⚠️ STUDENTS BELOW 75% ATTENDANCE']);
    studentData.push(['S.No', 'Register Number', 'Student Name', 'Present', 'Absent', 'Attendance %']);
    belowThreshold.forEach((student, index) => {
      const td = student.Total_Days_Present + student.Total_Days_Absent;
      const pct = td > 0 ? Math.round((student.Total_Days_Present / td) * 100) : 100;
      studentData.push([
        index + 1, student.Register_Number, student.Student_Name,
        student.Total_Days_Present, student.Total_Days_Absent, `${pct}%`
      ]);
    });
  }

  const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
  studentSheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Register Number
    { wch: 25 }, // Student Name
    { wch: 12 }, // Class
    { wch: 15 }, // Phone
    { wch: 18 }, // Present
    { wch: 18 }, // Absent
    { wch: 10 }, // OD
    { wch: 12 }, // Holidays
    { wch: 18 }, // Total Days
    { wch: 14 }, // %
    { wch: 12 }, // Zone
  ];
  studentSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
  ];

  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Data');

  // ===== SHEET 2: DAY-BY-DAY ATTENDANCE =====
  if (dates.length > 0) {
    const dailyData: (string | number)[][] = [];

    dailyData.push([`📅 ${className} - Day-by-Day Attendance Record`]);
    dailyData.push(['P = Present | A = Absent | OD = On Duty | - = Not Marked']);
    dailyData.push([]);

    // Header: S.No, Name, RegNo, ...dates..., Total P, Total A, Total OD, %
    const headerRow = [
      'S.No', 'Student Name', 'Register Number',
      ...dates.map(d => formatDate(d)),
      'Total Present', 'Total Absent', 'Total OD', 'Attendance %'
    ];
    dailyData.push(headerRow);

    // Student rows
    activeStudents.forEach((student, index) => {
      const row: (string | number)[] = [
        index + 1,
        student.Student_Name,
        student.Register_Number
      ];

      dates.forEach(date => {
        if (student.Join_Date && date < student.Join_Date) {
          row.push('N/A');
          return;
        }
        const record = classData.attendanceRecords.find(
          r => r.Student_ID === student.Student_ID && r.Date === date
        );
        if (!record) row.push('-');
        else if (record.Status === 'present') row.push('P');
        else if (record.Status === 'absent') row.push('A');
        else if (record.Status === 'od') row.push('OD');
        else row.push('-');
      });

      const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
      const pct = totalDays > 0 ? Math.round((student.Total_Days_Present / totalDays) * 100) : 100;

      row.push(student.Total_Days_Present, student.Total_Days_Absent, student.On_Duty_Days, `${pct}%`);
      dailyData.push(row);
    });

    // Daily totals
    dailyData.push([]);
    const presentRow: (string | number)[] = ['', 'PRESENT COUNT', ''];
    const absentRow: (string | number)[] = ['', 'ABSENT COUNT', ''];
    const odRow: (string | number)[] = ['', 'OD COUNT', ''];

    dates.forEach(date => {
      const dateRecords = classData.attendanceRecords.filter(r => r.Date === date);
      presentRow.push(dateRecords.filter(r => r.Status === 'present').length);
      absentRow.push(dateRecords.filter(r => r.Status === 'absent').length);
      odRow.push(dateRecords.filter(r => r.Status === 'od').length);
    });

    presentRow.push('', '', '', '');
    absentRow.push('', '', '', '');
    odRow.push('', '', '', '');

    dailyData.push(presentRow);
    dailyData.push(absentRow);
    dailyData.push(odRow);

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    const dailyCols = [{ wch: 6 }, { wch: 22 }, { wch: 16 }];
    dates.forEach(() => dailyCols.push({ wch: 12 }));
    dailyCols.push({ wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 });
    dailySheet['!cols'] = dailyCols;

    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Day-by-Day');
  }

  // ===== SHEET 3: HOLIDAYS =====
  const holidaysData: (string | number)[][] = [];
  holidaysData.push([`🏖️ ${className} - Holidays List`]);
  holidaysData.push([`Generated: ${formatDate(today)}`]);
  holidaysData.push([`Total Holidays: ${classData.holidayDates?.length || 0}`]);
  holidaysData.push([]);
  holidaysData.push(['S.No', 'Date', 'Day of Week', 'Reason']);

  if (classData.holidayDates && classData.holidayDates.length > 0) {
    classData.holidayDates.forEach((h, index) => {
      const dayOfWeek = new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' });
      holidaysData.push([index + 1, formatDate(h.date), dayOfWeek, h.reason || 'Holiday']);
    });
  } else {
    holidaysData.push(['-', 'No holidays recorded', '-', '-']);
  }
  const holidaysSheet = XLSX.utils.aoa_to_sheet(holidaysData);
  holidaysSheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, holidaysSheet, 'Holidays');

  const safeClassName = className.replace(/[\\/*?[\]:]/g, '-').substring(0, 20);
  XLSX.writeFile(workbook, `${safeClassName}-full-data-${today}.xlsx`);
};

// ============================================
// MONTH-WISE STUDENT DATA DOWNLOAD
// Filter by date range and show stats for that period
// ============================================
export const downloadMonthWiseExcel = (
  className: string,
  classData: ClassData,
  fromDate: string,
  toDate: string
): void => {
  const workbook = XLSX.utils.book_new();
  const today = getTodayDate();
  const activeStudents = classData.students.filter(s => !s.isRemoved);

  // Filter records by date range
  const filteredRecords = filterRecordsByDateRange(classData.attendanceRecords, fromDate, toDate);
  const filteredDates = [...new Set(filteredRecords.map(r => r.Date))].sort();
  const holidaysInPeriod = (classData.holidayDates || []).filter(
    h => h.date >= fromDate && h.date <= toDate
  );

  // Format the range for display
  const fromFormatted = formatDate(fromDate);
  const toFormatted = formatDate(toDate);
  const rangeLabel = `${fromFormatted} to ${toFormatted}`;

  // ===== SHEET 1: STUDENT DATA FOR SELECTED PERIOD =====
  const studentData: (string | number)[][] = [];

  studentData.push([`📋 ${className} - Student Attendance Report`]);
  studentData.push([`Period: ${rangeLabel}`]);
  studentData.push([`Generated: ${formatDate(today)}`]);
  studentData.push([`Total Students: ${activeStudents.length} | Days in Period: ${filteredDates.length} | Holidays in Period: ${holidaysInPeriod.length}`]);
  studentData.push([]);

  // Header
  studentData.push([
    'S.No',
    'Register Number',
    'Student Name',
    'Class',
    'Parent Phone',
    `Days Present (${rangeLabel})`,
    `Days Absent (${rangeLabel})`,
    `OD Days (${rangeLabel})`,
    `Holidays (${rangeLabel})`,
    'Total Days in Period',
    'Period Attendance %',
    'Overall Present',
    'Overall Absent',
    'Overall OD',
    'Overall Holidays',
    'Overall Attendance %',
    'Zone'
  ]);

  // Student rows
  activeStudents.forEach((student, index) => {
    // Stats for selected period only
    const periodStats = calculateStudentStats(student.Student_ID, filteredRecords);
    const periodTotal = periodStats.present + periodStats.absent;
    const periodPercentage = periodTotal > 0
      ? Math.round((periodStats.present / periodTotal) * 100)
      : (filteredDates.length > 0 ? 0 : 100);

    // Overall stats
    const overallTotal = student.Total_Days_Present + student.Total_Days_Absent;
    const overallPercentage = overallTotal > 0
      ? Math.round((student.Total_Days_Present / overallTotal) * 100)
      : 100;

    studentData.push([
      index + 1,
      student.Register_Number,
      student.Student_Name,
      student.Class,
      student.Parent_Phone,
      periodStats.present,
      periodStats.absent,
      periodStats.od,
      holidaysInPeriod.length,
      periodTotal,
      `${periodPercentage}%`,
      student.Total_Days_Present,
      student.Total_Days_Absent,
      student.On_Duty_Days,
      classData.holidayDates?.length || 0,
      `${overallPercentage}%`,
      student.Zone
    ]);
  });

  // Period totals
  studentData.push([]);
  let periodTotalPresent = 0;
  let periodTotalAbsent = 0;
  let periodTotalOD = 0;

  activeStudents.forEach(student => {
    const stats = calculateStudentStats(student.Student_ID, filteredRecords);
    periodTotalPresent += stats.present;
    periodTotalAbsent += stats.absent;
    periodTotalOD += stats.od;
  });

  const periodAvgPct = activeStudents.length > 0
    ? Math.round(activeStudents.reduce((sum, s) => {
        const stats = calculateStudentStats(s.Student_ID, filteredRecords);
        const total = stats.present + stats.absent;
        return sum + (total > 0 ? Math.round((stats.present / total) * 100) : 100);
      }, 0) / activeStudents.length)
    : 0;

  studentData.push([
    '', '', 'PERIOD TOTALS', '', '',
    periodTotalPresent, periodTotalAbsent, periodTotalOD,
    holidaysInPeriod.length,
    periodTotalPresent + periodTotalAbsent,
    `${periodAvgPct}% (avg)`,
    '', '', '', (classData.holidayDates?.length || 0), '', ''
  ]);

  // Students below 75% in this period
  const belowInPeriod = activeStudents.filter(s => {
    const stats = calculateStudentStats(s.Student_ID, filteredRecords);
    const total = stats.present + stats.absent;
    const pct = total > 0 ? Math.round((stats.present / total) * 100) : 100;
    return pct < 75 && total > 0;
  });

  if (belowInPeriod.length > 0) {
    studentData.push([]);
    studentData.push([`⚠️ STUDENTS BELOW 75% IN THIS PERIOD (${rangeLabel})`]);
    studentData.push(['S.No', 'Register Number', 'Student Name', 'Present', 'Absent', 'Period %', 'Overall %']);

    belowInPeriod.forEach((student, index) => {
      const stats = calculateStudentStats(student.Student_ID, filteredRecords);
      const total = stats.present + stats.absent;
      const periodPct = total > 0 ? Math.round((stats.present / total) * 100) : 100;
      const overallTotal = student.Total_Days_Present + student.Total_Days_Absent;
      const overallPct = overallTotal > 0 ? Math.round((student.Total_Days_Present / overallTotal) * 100) : 100;

      studentData.push([
        index + 1, student.Register_Number, student.Student_Name,
        stats.present, stats.absent, `${periodPct}%`, `${overallPct}%`
      ]);
    });
  }

  const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
  studentSheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Register Number
    { wch: 25 }, // Student Name
    { wch: 12 }, // Class
    { wch: 15 }, // Phone
    { wch: 20 }, // Period Present
    { wch: 20 }, // Period Absent
    { wch: 16 }, // Period OD
    { wch: 16 }, // Period Holidays
    { wch: 18 }, // Period Total
    { wch: 18 }, // Period %
    { wch: 16 }, // Overall Present
    { wch: 16 }, // Overall Absent
    { wch: 12 }, // Overall OD
    { wch: 16 }, // Overall Holidays
    { wch: 18 }, // Overall %
    { wch: 12 }, // Zone
  ];
  studentSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 16 } },
  ];

  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Period Summary');

  // ===== SHEET 2: DAY-BY-DAY FOR SELECTED PERIOD =====
  if (filteredDates.length > 0) {
    const dailyData: (string | number)[][] = [];

    dailyData.push([`📅 ${className} - Day-by-Day Attendance (${rangeLabel})`]);
    dailyData.push(['P = Present | A = Absent | OD = On Duty | - = Not Marked']);
    dailyData.push([]);

    const headerRow = [
      'S.No', 'Student Name', 'Register Number',
      ...filteredDates.map(d => formatDate(d)),
      'Present', 'Absent', 'OD', 'Period %'
    ];
    dailyData.push(headerRow);

    activeStudents.forEach((student, index) => {
      const row: (string | number)[] = [
        index + 1,
        student.Student_Name,
        student.Register_Number
      ];

      filteredDates.forEach(date => {
        const record = filteredRecords.find(
          r => r.Student_ID === student.Student_ID && r.Date === date
        );
        if (!record) row.push('-');
        else if (record.Status === 'present') row.push('P');
        else if (record.Status === 'absent') row.push('A');
        else if (record.Status === 'od') row.push('OD');
        else row.push('-');
      });

      const stats = calculateStudentStats(student.Student_ID, filteredRecords);
      const total = stats.present + stats.absent;
      const pct = total > 0 ? Math.round((stats.present / total) * 100) : 100;

      row.push(stats.present, stats.absent, stats.od, `${pct}%`);
      dailyData.push(row);
    });

    // Daily totals
    dailyData.push([]);
    const presentRow: (string | number)[] = ['', 'PRESENT', ''];
    const absentRow: (string | number)[] = ['', 'ABSENT', ''];
    const odRow: (string | number)[] = ['', 'OD', ''];

    filteredDates.forEach(date => {
      const dateRecords = filteredRecords.filter(r => r.Date === date);
      presentRow.push(dateRecords.filter(r => r.Status === 'present').length);
      absentRow.push(dateRecords.filter(r => r.Status === 'absent').length);
      odRow.push(dateRecords.filter(r => r.Status === 'od').length);
    });

    presentRow.push('', '', '', '');
    absentRow.push('', '', '', '');
    odRow.push('', '', '', '');

    dailyData.push(presentRow);
    dailyData.push(absentRow);
    dailyData.push(odRow);

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    const dailyCols = [{ wch: 6 }, { wch: 22 }, { wch: 16 }];
    filteredDates.forEach(() => dailyCols.push({ wch: 12 }));
    dailyCols.push({ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 });
    dailySheet['!cols'] = dailyCols;

    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Day-by-Day');
  }

  // ===== SHEET 3: MONTH-WISE BREAKDOWN =====
  const monthlyBreakdown: (string | number)[][] = [];
  monthlyBreakdown.push([`📊 ${className} - Monthly Breakdown (${rangeLabel})`]);
  monthlyBreakdown.push([]);

  // Get all unique months in the range
  const monthsInRange: { year: number; month: number; label: string }[] = [];
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);

  const currentIterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (currentIterDate <= endDate) {
    monthsInRange.push({
      year: currentIterDate.getFullYear(),
      month: currentIterDate.getMonth(),
      label: `${getMonthName(currentIterDate.getMonth())} ${currentIterDate.getFullYear()}`
    });
    currentIterDate.setMonth(currentIterDate.getMonth() + 1);
  }

  // Header
  const monthHeader: (string | number)[] = ['S.No', 'Register Number', 'Student Name'];
  monthsInRange.forEach(m => {
    monthHeader.push(`${m.label} - P`);
    monthHeader.push(`${m.label} - A`);
    monthHeader.push(`${m.label} - OD`);
    monthHeader.push(`${m.label} - %`);
  });
  monthHeader.push('Total P', 'Total A', 'Total OD', 'Overall %');
  monthlyBreakdown.push(monthHeader);

  // Student rows
  activeStudents.forEach((student, index) => {
    const row: (string | number)[] = [
      index + 1,
      student.Register_Number,
      student.Student_Name
    ];

    let studentTotalP = 0;
    let studentTotalA = 0;
    let studentTotalOD = 0;

    monthsInRange.forEach(m => {
      // Get first and last day of the month within range
      const monthStart = new Date(m.year, m.month, 1);
      const monthEnd = new Date(m.year, m.month + 1, 0);

      const effectiveStart = monthStart < startDate ? fromDate : monthStart.toISOString().split('T')[0];
      const effectiveEnd = monthEnd > endDate ? toDate : monthEnd.toISOString().split('T')[0];

      const monthRecords = filteredRecords.filter(
        r => r.Student_ID === student.Student_ID && r.Date >= effectiveStart && r.Date <= effectiveEnd
      );

      const p = monthRecords.filter(r => r.Status === 'present').length;
      const a = monthRecords.filter(r => r.Status === 'absent').length;
      const od = monthRecords.filter(r => r.Status === 'od').length;
      const total = p + a;
      const pct = total > 0 ? Math.round((p / total) * 100) : (total === 0 ? '-' : 0);

      studentTotalP += p;
      studentTotalA += a;
      studentTotalOD += od;

      row.push(p, a, od, pct === '-' ? '-' : `${pct}%`);
    });

    const overallTotal = studentTotalP + studentTotalA;
    const overallPct = overallTotal > 0 ? Math.round((studentTotalP / overallTotal) * 100) : 100;

    row.push(studentTotalP, studentTotalA, studentTotalOD, `${overallPct}%`);
    monthlyBreakdown.push(row);
  });

  const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyBreakdown);
  const monthlyCols = [{ wch: 6 }, { wch: 18 }, { wch: 22 }];
  monthsInRange.forEach(() => {
    monthlyCols.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 });
  });
  monthlyCols.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 });
  monthlySheet['!cols'] = monthlyCols;

  XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Breakdown');

  // ===== SHEET 4: HOLIDAYS IN PERIOD =====
  const holidayData: (string | number)[][] = [];
  holidayData.push([`🏖️ ${className} - Holidays in Period (${rangeLabel})`]);
  holidayData.push([`Generated: ${formatDate(today)}`]);
  holidayData.push([`Total Holidays in Period: ${holidaysInPeriod.length} | Total Holidays Overall: ${classData.holidayDates?.length || 0}`]);
  holidayData.push([]);
  holidayData.push(['S.No', 'Date', 'Day of Week', 'Reason']);

  if (holidaysInPeriod.length > 0) {
    holidaysInPeriod.forEach((h, index) => {
      const dayOfWeek = new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' });
      holidayData.push([index + 1, formatDate(h.date), dayOfWeek, h.reason || 'Holiday']);
    });
  } else {
    holidayData.push(['-', 'No holidays in this period', '-', '-']);
  }
  const holidaySheet = XLSX.utils.aoa_to_sheet(holidayData);
  holidaySheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, holidaySheet, 'Holidays');

  // Download
  const fromMonth = getMonthName(new Date(fromDate).getMonth()).substring(0, 3);
  const toMonth = getMonthName(new Date(toDate).getMonth()).substring(0, 3);
  const safeClassName = className.replace(/[\\/*?[\]:]/g, '-').substring(0, 15);

  XLSX.writeFile(workbook, `${safeClassName}-${fromMonth}-to-${toMonth}-${today}.xlsx`);
};

// ============================================
// FULL BACKUP - All classes in one Excel file
// Each class = separate sheet
// ============================================
export const downloadFullBackupExcel = (appData: AppData): void => {
  const workbook = XLSX.utils.book_new();
  const today = getTodayDate();

  // ===== SUMMARY SHEET =====
  const summaryData: (string | number)[][] = [];
  summaryData.push(['📊 ATTENDANCE SYSTEM - FULL BACKUP']);
  summaryData.push([`Export Date: ${formatDate(today)}`]);
  summaryData.push([`Total Classes: ${appData.savedClassNames.length}`]);
  summaryData.push([]);

  summaryData.push([
    'Class Name', 'Total Students', 'Active Students', 'Removed',
    'Working Days', 'Days Recorded', 'Holidays', 'Total Records', 'Status', 'Created'
  ]);

  appData.savedClassNames.forEach(className => {
    const classData = appData.classes[className];
    if (!classData) return;

    summaryData.push([
      className,
      classData.students.length,
      classData.students.filter(s => !s.isRemoved).length,
      classData.students.filter(s => s.isRemoved).length,
      classData.totalWorkingDays,
      classData.attendanceMarkedDates.length,
      classData.holidayDates?.length || 0,
      classData.attendanceRecords.length,
      classData.isLocked ? '🔒 Locked' : '📝 Open',
      classData.createdDate || '-'
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ===== ONE SHEET PER CLASS =====
  appData.savedClassNames.forEach(className => {
    const classData = appData.classes[className];
    if (!classData) return;

    const activeStudents = classData.students.filter(s => !s.isRemoved);
    const dates = [...classData.attendanceMarkedDates].sort();
    const sheetData: (string | number)[][] = [];

    sheetData.push([`📋 ${className} - Complete Attendance Data`]);
    sheetData.push([`Students: ${activeStudents.length} | Working Days: ${classData.totalWorkingDays} | Days Recorded: ${dates.length} | Holidays: ${classData.holidayDates?.length || 0}`]);
    sheetData.push([]);

    // Student data
    sheetData.push([
      'S.No', 'Register Number', 'Student Name', 'Class', 'Parent Phone',
      'Days Present', 'Days Absent', 'OD Days', 'Holidays', 'Total Days', 'Attendance %', 'Zone', 'Status'
    ]);

    activeStudents.forEach((student, index) => {
      const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
      const pct = totalDays > 0 ? Math.round((student.Total_Days_Present / totalDays) * 100) : 100;

      sheetData.push([
        index + 1, student.Register_Number, student.Student_Name,
        student.Class, student.Parent_Phone,
        student.Total_Days_Present, student.Total_Days_Absent, student.On_Duty_Days,
        classData.holidayDates?.length || 0,
        totalDays, `${pct}%`, student.Zone, 'Active'
      ]);
    });

    // Removed students
    const removedStudents = classData.students.filter(s => s.isRemoved);
    if (removedStudents.length > 0) {
      sheetData.push([]);
      sheetData.push(['--- REMOVED STUDENTS ---']);
      removedStudents.forEach((student, index) => {
        const totalDays = student.Total_Days_Present + student.Total_Days_Absent;
        const pct = totalDays > 0 ? Math.round((student.Total_Days_Present / totalDays) * 100) : 100;
        sheetData.push([
          `R${index + 1}`, student.Register_Number, student.Student_Name,
          student.Class, student.Parent_Phone,
          student.Total_Days_Present, student.Total_Days_Absent, student.On_Duty_Days,
          classData.holidayDates?.length || 0,
          totalDays, `${pct}%`, student.Zone, '❌ Removed'
        ]);
      });
    }

    // Day-by-day section
    if (dates.length > 0) {
      sheetData.push([]);
      sheetData.push([]);
      sheetData.push(['═══ DAY-BY-DAY ATTENDANCE ═══']);
      sheetData.push(['P = Present | A = Absent | OD = On Duty']);
      sheetData.push([]);

      const dateHeader = ['S.No', 'Student Name', 'Reg.No', ...dates.map(d => formatDate(d))];
      sheetData.push(dateHeader);

      activeStudents.forEach((student, index) => {
        const row: (string | number)[] = [index + 1, student.Student_Name, student.Register_Number];
        dates.forEach(date => {
          const record = classData.attendanceRecords.find(
            r => r.Student_ID === student.Student_ID && r.Date === date
          );
          if (!record) row.push('-');
          else if (record.Status === 'present') row.push('P');
          else if (record.Status === 'absent') row.push('A');
          else if (record.Status === 'od') row.push('OD');
          else row.push('-');
        });
        sheetData.push(row);
      });
    }

    const classSheet = XLSX.utils.aoa_to_sheet(sheetData);
    const colWidths = [
      { wch: 6 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 15 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
    ];
    dates.forEach(() => colWidths.push({ wch: 12 }));
    classSheet['!cols'] = colWidths;

    const safeSheetName = className.replace(/[\\/*?[\]:]/g, '-').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, classSheet, safeSheetName);
  });

  XLSX.writeFile(workbook, `attendance-full-backup-${today}.xlsx`);
};