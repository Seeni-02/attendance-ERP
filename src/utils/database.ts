import { supabase } from '../supabase';
import { Student, AttendanceRecord, ClassData, AppData, HolidayRecord } from '../types';
import { createEmptyClassData, getTodayDate } from './helpers';

// ==================== SAVE CLASS ====================
export const saveClassToDB = async (className: string, classData: ClassData): Promise<void> => {
  try {
    const { error: classError } = await supabase
      .from('classes')
      .upsert({
        name: className,
        is_locked: classData.isLocked,
        password: classData.password || '',
        total_working_days: classData.totalWorkingDays,
        created_date: classData.createdDate,
        attendance_marked_dates: classData.attendanceMarkedDates,
      });

    if (classError) throw classError;

    if (classData.students.length > 0) {
      const studentsToUpsert = classData.students.map(s => {
        const payload: Record<string, any> = {
          student_id: s.Student_ID,
          class_name: className,
          student_name: s.Student_Name,
          register_number: s.Register_Number,
          parent_phone: s.Parent_Phone,
          total_days_present: s.Total_Days_Present,
          total_days_absent: s.Total_Days_Absent,
          leave_days: s.Leave_Days,
          on_duty_days: s.On_Duty_Days,
          zone: s.Zone,
          is_removed: s.isRemoved || false,
        };
        if (s.Join_Date) {
          payload.created_at = new Date(s.Join_Date + 'T00:00:00.000Z').toISOString();
        }
        return payload;
      });
      const { error: studentError } = await supabase.from('students').upsert(studentsToUpsert);
      if (studentError) throw studentError;
    }

    if (classData.attendanceRecords.length > 0) {
      const recordsToUpsert = classData.attendanceRecords.map(r => ({
        id: r.Student_ID + '_' + r.Date,
        student_id: r.Student_ID,
        class_name: className,
        date: r.Date,
        status: r.Status,
        sms_sent: r.SMS_Sent,
        sms_status: r.SMS_Status,
      }));
      const { error: recordError } = await supabase.from('attendance_records').upsert(recordsToUpsert);
      if (recordError) throw recordError;
    }

    if (classData.holidayDates && classData.holidayDates.length > 0) {
      for (const h of classData.holidayDates) {
        await supabase.from('holidays').delete().eq('class_name', className).eq('date', h.date);
        const { error: holidayError } = await supabase.from('holidays').insert({
          class_name: className,
          date: h.date,
          reason: h.reason || 'Holiday',
        });
        if (holidayError) console.error('Holiday insert error:', holidayError);
      }
    }

    console.log('Class ' + className + ' saved to Supabase');
  } catch (error) {
    console.error('Error saving class ' + className + ':', error);
  }
};

// ==================== LOAD CLASS ====================
export const loadClassFromDB = async (className: string): Promise<ClassData | null> => {
  try {
    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('name', className)
      .single();

    if (classError || !classInfo) return null;

    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('class_name', className);

    const students: Student[] = (studentsData || []).map(s => ({
      Student_ID: s.student_id,
      Student_Name: s.student_name,
      Register_Number: s.register_number,
      Class: s.class_name,
      Parent_Phone: s.parent_phone,
      Total_Days_Present: s.total_days_present,
      Total_Days_Absent: s.total_days_absent,
      Leave_Days: s.leave_days,
      On_Duty_Days: s.on_duty_days,
      Zone: s.zone,
      isRemoved: s.is_removed,
      Last_SMS_Status: s.last_sms_status,
      Last_SMS_Date: s.last_sms_date,
      Join_Date: s.join_date || (s.created_at ? s.created_at.split('T')[0] : (classInfo.created_date || getTodayDate())),
    }));

    const { data: recordsData } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('class_name', className);

    const attendanceRecords: AttendanceRecord[] = (recordsData || []).map(r => ({
      Student_ID: r.student_id,
      Date: r.date,
      Status: r.status,
      SMS_Sent: r.sms_sent,
      SMS_Status: r.sms_status,
    }));

    const { data: holidayData } = await supabase
      .from('holidays')
      .select('*')
      .eq('class_name', className);

    const holidayDates: HolidayRecord[] = (holidayData || []).map(h => ({
      date: h.date,
      reason: h.reason,
    }));

    return {
      students,
      attendanceRecords,
      isLocked: classInfo.is_locked,
      password: classInfo.password || '',
      totalWorkingDays: classInfo.total_working_days,
      createdDate: classInfo.created_date,
      attendanceMarkedDates: classInfo.attendance_marked_dates || [],
      holidayDates,
    };
  } catch (error) {
    console.error('Error loading class ' + className + ':', error);
    return null;
  }
};

// ==================== DELETE CLASS ====================
export const deleteClassFromDB = async (className: string): Promise<void> => {
  try {
    const { error } = await supabase.from('classes').delete().eq('name', className);
    if (error) throw error;
    console.log('Class ' + className + ' deleted from Supabase');
  } catch (error) {
    console.error('Error deleting class ' + className + ':', error);
  }
};

// ==================== ADD STUDENT ====================
export const addStudentToDB = async (className: string, student: Student): Promise<void> => {
  try {
    const studentPayload: Record<string, any> = {
      student_id: student.Student_ID,
      class_name: className,
      student_name: student.Student_Name,
      register_number: student.Register_Number,
      parent_phone: student.Parent_Phone,
      total_days_present: student.Total_Days_Present,
      total_days_absent: student.Total_Days_Absent,
      leave_days: student.Leave_Days,
      on_duty_days: student.On_Duty_Days,
      zone: student.Zone,
      is_removed: student.isRemoved || false,
    };
    if (student.Join_Date) {
      studentPayload.join_date = student.Join_Date;
      studentPayload.created_at = new Date(student.Join_Date + 'T00:00:00.000Z').toISOString();
    }
    const { error } = await supabase.from('students').upsert(studentPayload);
    if (error) throw error;
  } catch (error) {
    console.error('Error adding student:', error);
  }
};

// ==================== UPDATE STUDENT ====================
export const updateStudentInDB = async (
  _className: string,
  studentId: string,
  updatedData: Partial<Student>
): Promise<void> => {
  try {
    const updateObj: Record<string, any> = {};
    if (updatedData.Student_Name !== undefined) updateObj.student_name = updatedData.Student_Name;
    if (updatedData.Register_Number !== undefined) updateObj.register_number = updatedData.Register_Number;
    if (updatedData.Parent_Phone !== undefined) updateObj.parent_phone = updatedData.Parent_Phone;
    if (updatedData.Total_Days_Present !== undefined) updateObj.total_days_present = updatedData.Total_Days_Present;
    if (updatedData.Total_Days_Absent !== undefined) updateObj.total_days_absent = updatedData.Total_Days_Absent;
    if (updatedData.Leave_Days !== undefined) updateObj.leave_days = updatedData.Leave_Days;
    if (updatedData.On_Duty_Days !== undefined) updateObj.on_duty_days = updatedData.On_Duty_Days;
    if (updatedData.Zone !== undefined) updateObj.zone = updatedData.Zone;
    if (updatedData.isRemoved !== undefined) updateObj.is_removed = updatedData.isRemoved;

    const { error } = await supabase.from('students').update(updateObj).eq('student_id', studentId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating student:', error);
  }
};

// ==================== REMOVE STUDENT ====================
export const removeStudentFromDB = async (_className: string, studentId: string): Promise<void> => {
  try {
    const { error } = await supabase.from('students').update({ is_removed: true }).eq('student_id', studentId);
    if (error) throw error;
  } catch (error) {
    console.error('Error removing student:', error);
  }
};

// ==================== MARK ATTENDANCE ====================
export const markAttendanceInDB = async (
  className: string,
  record: AttendanceRecord,
  updatedStudent: Student
): Promise<void> => {
  try {
    const { error: recordError } = await supabase.from('attendance_records').upsert({
      id: record.Student_ID + '_' + record.Date,
      student_id: record.Student_ID,
      class_name: className,
      date: record.Date,
      status: record.Status,
      sms_sent: record.SMS_Sent,
      sms_status: record.SMS_Status,
    });
    if (recordError) throw recordError;

    const { error: studentError } = await supabase.from('students').update({
      total_days_present: updatedStudent.Total_Days_Present,
      total_days_absent: updatedStudent.Total_Days_Absent,
      leave_days: updatedStudent.Leave_Days,
      on_duty_days: updatedStudent.On_Duty_Days,
      zone: updatedStudent.Zone,
    }).eq('student_id', record.Student_ID);
    if (studentError) throw studentError;
  } catch (error) {
    console.error('Error marking attendance:', error);
  }
};

// ==================== MARK BULK ATTENDANCE ====================
export const markBulkAttendanceInDB = async (
  className: string,
  records: AttendanceRecord[],
  updatedStudents: Student[],
  newMarkedDates: string[]
): Promise<void> => {
  try {
    if (records.length > 0) {
      const recordsToUpsert = records.map(r => ({
        id: r.Student_ID + '_' + r.Date,
        student_id: r.Student_ID,
        class_name: className,
        date: r.Date,
        status: r.Status,
        sms_sent: r.SMS_Sent,
        sms_status: r.SMS_Status,
      }));
      const { error: recErr } = await supabase.from('attendance_records').upsert(recordsToUpsert);
      if (recErr) throw recErr;
    }

    if (updatedStudents.length > 0) {
      const studentsToUpsert = updatedStudents.map(s => {
        const payload: Record<string, any> = {
          student_id: s.Student_ID,
          class_name: className,
          student_name: s.Student_Name,
          register_number: s.Register_Number,
          parent_phone: s.Parent_Phone,
          total_days_present: s.Total_Days_Present,
          total_days_absent: s.Total_Days_Absent,
          leave_days: s.Leave_Days,
          on_duty_days: s.On_Duty_Days,
          zone: s.Zone,
          is_removed: s.isRemoved || false,
        };
        if (s.Join_Date) {
          payload.join_date = s.Join_Date;
          payload.created_at = new Date(s.Join_Date + 'T00:00:00.000Z').toISOString();
        }
        return payload;
      });
      const { error: stuErr } = await supabase.from('students').upsert(studentsToUpsert);
      if (stuErr) throw stuErr;
    }

    if (newMarkedDates.length > 0) {
      await updateClassMetaInDB(className, { attendanceMarkedDates: newMarkedDates });
    }
  } catch (error) {
    console.error('Error in markBulkAttendanceInDB:', error);
  }
};

// ==================== CLEAR DATE ATTENDANCE ====================
export const clearDateAttendanceFromDB = async (
  className: string,
  date: string,
  updatedStudents: Student[],
  newMarkedDates: string[]
): Promise<void> => {
  try {
    const { error: delErr } = await supabase
      .from('attendance_records')
      .delete()
      .eq('class_name', className)
      .eq('date', date);
    if (delErr) console.error('Error deleting attendance records for holiday date:', delErr);

    if (updatedStudents.length > 0) {
      const studentsToUpsert = updatedStudents.map(s => {
        const payload: Record<string, any> = {
          student_id: s.Student_ID,
          class_name: className,
          student_name: s.Student_Name,
          register_number: s.Register_Number,
          parent_phone: s.Parent_Phone,
          total_days_present: s.Total_Days_Present,
          total_days_absent: s.Total_Days_Absent,
          leave_days: s.Leave_Days,
          on_duty_days: s.On_Duty_Days,
          zone: s.Zone,
          is_removed: s.isRemoved || false,
        };
        if (s.Join_Date) {
          payload.created_at = new Date(s.Join_Date + 'T00:00:00.000Z').toISOString();
        }
        return payload;
      });
      await supabase.from('students').upsert(studentsToUpsert);
    }

    await updateClassMetaInDB(className, { attendanceMarkedDates: newMarkedDates });
  } catch (error) {
    console.error('Error in clearDateAttendanceFromDB:', error);
  }
};

// ==================== UPDATE CLASS META ====================
export const updateClassMetaInDB = async (
  className: string,
  data: Record<string, any>
): Promise<void> => {
  try {
    const updateObj: Record<string, any> = {};
    if (data.isLocked !== undefined) updateObj.is_locked = data.isLocked;
    if (data.password !== undefined) updateObj.password = data.password;
    if (data.totalWorkingDays !== undefined) updateObj.total_working_days = data.totalWorkingDays;
    if (data.attendanceMarkedDates !== undefined) updateObj.attendance_marked_dates = data.attendanceMarkedDates;

    // Handle holidays if it's sent through updateClassMetaInDB (though usually it's better handled separately now)

    if (Object.keys(updateObj).length > 0) {
      const { error } = await supabase.from('classes').update(updateObj).eq('name', className);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating class meta:', error);
  }
};

export const addHolidayToDB = async (className: string, holiday: HolidayRecord): Promise<void> => {
  try {
    await supabase.from('holidays').delete().eq('class_name', className).eq('date', holiday.date);
    const { error } = await supabase.from('holidays').insert({
      class_name: className,
      date: holiday.date,
      reason: holiday.reason || 'Holiday',
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error adding holiday:', error);
  }
};

export const removeHolidayFromDB = async (className: string, date: string): Promise<void> => {
  try {
    const { error } = await supabase.from('holidays').delete().eq('class_name', className).eq('date', date);
    if (error) throw error;
  } catch (error) {
    console.error('Error removing holiday:', error);
  }
};


// ==================== SAVE CLASS NAMES ====================
export const saveClassNamesToDB = async (classNames: string[]): Promise<void> => {
  try {
    const { error } = await supabase.from('app_meta').upsert({
      id: 'config',
      saved_class_names: classNames,
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving class names:', error);
  }
};

// ==================== LOAD CLASS NAMES ====================
export const loadClassNamesFromDB = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase.from('app_meta').select('saved_class_names').eq('id', 'config').single();
    if (error || !data) return [];
    return data.saved_class_names || [];
  } catch (error) {
    console.error('Error loading class names:', error);
    return [];
  }
};

// ==================== LOAD FULL APP DATA ====================
export const loadFullAppDataFromDB = async (): Promise<AppData | null> => {
  try {
    const classNames = await loadClassNamesFromDB();
    if (classNames.length === 0) return null;

    const classes: Record<string, ClassData> = {};
    for (let i = 0; i < classNames.length; i++) {
      const name = classNames[i];
      const classData = await loadClassFromDB(name);
      if (classData) {
        classes[name] = classData;
      } else {
        classes[name] = createEmptyClassData();
      }
    }

    const appData: AppData = {
      classes: classes,
      savedClassNames: classNames,
      currentClass: null,
      currentDate: getTodayDate(),
      currentView: 'dashboard',
    };

    return appData;
  } catch (error) {
    console.error('Error loading full app data:', error);
    return null;
  }
};