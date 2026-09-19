-- Supabase Schema for Attendance Management App

-- Classes Table
CREATE TABLE public.classes (
    name text PRIMARY KEY,
    is_locked boolean DEFAULT false,
    password text,
    total_working_days integer DEFAULT 0,
    created_date text NOT NULL,
    attendance_marked_dates text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Students Table
CREATE TABLE public.students (
    student_id text PRIMARY KEY,
    class_name text REFERENCES public.classes(name) ON DELETE CASCADE,
    student_name text NOT NULL,
    register_number text NOT NULL,
    parent_phone text,
    total_days_present integer DEFAULT 0,
    total_days_absent integer DEFAULT 0,
    leave_days integer DEFAULT 0,
    on_duty_days integer DEFAULT 0,
    zone text DEFAULT 'green',
    last_sms_status text,
    last_sms_date text,
    is_removed boolean DEFAULT false,
    join_date text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional migration statement for existing databases:
-- ALTER TABLE public.students ADD COLUMN IF NOT EXISTS join_date text;

-- Attendance Records Table
CREATE TABLE public.attendance_records (
    id text PRIMARY KEY, -- We'll use student_id + '_' + date as ID
    student_id text REFERENCES public.students(student_id) ON DELETE CASCADE,
    class_name text REFERENCES public.classes(name) ON DELETE CASCADE,
    date text NOT NULL,
    status text NOT NULL, -- 'present', 'absent', 'od'
    sms_sent boolean DEFAULT false,
    sms_status text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, date)
);

-- Holidays Table
CREATE TABLE public.holidays (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    class_name text REFERENCES public.classes(name) ON DELETE CASCADE,
    date text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_name, date)
);

-- App Meta (for storing global config, like saved class names if needed)
CREATE TABLE public.app_meta (
    id text PRIMARY KEY,
    saved_class_names text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default app meta config
INSERT INTO public.app_meta (id, saved_class_names) VALUES ('config', '{}') ON CONFLICT DO NOTHING;

-- Enable Realtime for all tables
alter publication supabase_realtime add table classes, students, attendance_records, holidays, app_meta;

