# دفتري

ملاحظاتي، مواعيدي، مهامي، بنفس تصميم فزعة (Next.js + Supabase، عربي RTL، وضع داكن/فاتح، جوال وكمبيوتر).

## التشغيل (5 خطوات)
1. أنشئ مشروعًا جديدًا في Supabase (يُفضّل مشروع مستقل عن فزعة).
2. في Supabase > SQL Editor الصق محتوى `supabase-setup.sql` ثم Run.
3. من Supabase > Project Settings > API انسخ: Project URL و anon public و service_role.
4. في Vercel > Settings > Environment Variables أضف المتغيرات الثلاثة (انظر `vercel-env.txt`):
   - `NEXT_PUBLIC_SUPABASE_URL` (نوع Config) مثل https://abcdefgh.supabase.co بدون أي مسار بعده
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (نوع Config)
   - `SUPABASE_SERVICE_ROLE_KEY` (نوع Secret، سري جدًا)
5. اعمل Redeploy (تعديل المتغيرات لا يُطبَّق إلا بعد إعادة النشر).

## الفحص الذاتي
بعد النشر افتح: `https://موقعك.vercel.app/api/health`
- `"ok": true` يعني كل شيء سليم ويمكنك إنشاء حساب.
- غير ذلك: ستجد في `checks` أي متغير فيه مشكلة وسببها بالعربي. (لا يكشف أي مفتاح)

## التشغيل محليًا
انسخ `.env.local.example` إلى `.env.local` واملأه، ثم:
```
npm install
npm run dev
```

## الأقسام
- الرئيسية: ملخص + اختصارات إضافة سريعة
- ملاحظاتي: عنوان ونص ولون وتاغات وتثبيت وبحث
- مواعيدي: تاريخ ووقت ومكان، قادمة ومنتهية مع المتبقي
- مهامي: إضافة سريعة، أولوية، تاريخ استحقاق، إنجاز
- الإعدادات: الاسم وكلمة المرور

## إضافة قسم جديد
1. أنشئ جدولًا في SQL مع سياسة `auth.uid() = user_id` (انسخ نمط جدول tasks).
2. أنشئ `app/dashboard/<القسم>/page.js` (انسخ صفحة المهام كنقطة بداية).
3. أضف عنصرًا في مصفوفة ITEMS داخل `app/dashboard/layout.js`.
