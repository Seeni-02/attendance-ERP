import sys

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for supabase
if "import { supabase }" not in content:
    content = content.replace(
        "import NotificationToast from './components/NotificationToast';",
        "import NotificationToast from './components/NotificationToast';\nimport { supabase } from './supabase';"
    )

realtime_code = """    const loadData = async () => {
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
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime change received!', payload);
          // Debounce or just load data directly
          // We wrap it to avoid overlapping loads if multiple events fire
          setTimeout(() => {
            loadFullAppDataFromDB().then(dbData => {
                if (dbData) setAppData(dbData);
            });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
"""

# Replace the existing useEffect content
import re
pattern = r"const loadData = async \(\) => \{.*?;(?=\s*\},\s*\[\]\);)"
content = re.sub(pattern, realtime_code, content, flags=re.DOTALL)

with open(r'c:\Users\ADMIN\Downloads\attendnace--ERP-main\attendnace--ERP-main\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
