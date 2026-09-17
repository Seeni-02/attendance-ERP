import sys

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleMarkHoliday
content = content.replace(
    'const handleMarkHoliday = async (date: string) => {',
    'const handleMarkHoliday = async (date: string, reason: string) => {'
)
content = content.replace(
    'if (currentClassData.holidayDates?.includes(date)) {',
    'if (currentClassData.holidayDates?.some(h => h.date === date)) {'
)
content = content.replace(
    'const newHolidayDates = [...(prevClassData.holidayDates || []), date];',
    'const newHolidayDates = [...(prevClassData.holidayDates || []), { date, reason }];'
)

content = content.replace(
    'await updateClassMetaInDB(currentClass, { holidayDates: [...(currentClassData.holidayDates || []), date] });',
    'await addHolidayToDB(currentClass, { date, reason });'
)

# Fix handleRemoveHoliday
content = content.replace(
    'const newHolidayDates = (prevClassData.holidayDates || []).filter(d => d !== date);',
    'const newHolidayDates = (prevClassData.holidayDates || []).filter(h => h.date !== date);'
)
content = content.replace(
    'await updateClassMetaInDB(currentClass, { holidayDates: (currentClassData.holidayDates || []).filter(d => d !== date) });',
    'await removeHolidayFromDB(currentClass, date);'
)

# Fix import to include addHolidayToDB and removeHolidayFromDB
content = content.replace(
    '  updateClassMetaInDB,\n} from \'./utils/database\';',
    '  updateClassMetaInDB,\n  addHolidayToDB,\n  removeHolidayFromDB,\n} from \'./utils/database\';'
)

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
