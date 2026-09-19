export interface Student {
  Student_ID: string;
  Student_Name: string;
  Register_Number: string;
  Class: string;
  Parent_Phone: string;
  Total_Days_Present: number;
  Total_Days_Absent: number;
  Leave_Days: number;
  On_Duty_Days: number;
  Zone: ZoneType;
  Last_SMS_Status?: 'delivered' | 'failed' | 'pending';
  Last_SMS_Date?: string;
  isRemoved?: boolean;
  Join_Date?: string;
}

export interface AttendanceRecord {
  Student_ID: string;
  Date: string;
  Status: 'present' | 'absent' | 'od';
  SMS_Sent: boolean;
  SMS_Status: 'delivered' | 'failed' | 'pending';
}

export interface HolidayRecord {
  date: string;
  reason: string;
}

export interface ClassData {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  isLocked: boolean;
  totalWorkingDays: number;
  createdDate: string;
  attendanceMarkedDates: string[];
  holidayDates: HolidayRecord[];
  password?: string;
}

export interface AppData {
  classes: Record<string, ClassData>;
  savedClassNames: string[];
  currentClass: string | null;
  currentDate: string;
  currentView: 'dashboard' | 'attendance' | 'students' | 'reports' | 'database';
}

export type ZoneType = 'red' | 'yellow' | 'green' | 'blue-star' | 'blue-od';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}