# RTL Container Centering Patch (/student)

## الأسباب الجذرية
- وجود إعادة ضبط عامة سابقة على `*` تشمل `margin: 0` و`padding: 0` كان يرفع احتمال تداخل الأولويات مع مرافقات تمركز Tailwind في مسارات RTL.
- استخدام `mx-auto` يعتمد على `margin-inline: auto`، وهو صحيح غالبًا، لكن في هذا السياق كان المطلوب تثبيت التمركز بشكل صريح ثنائي الاتجاه عبر `ml-auto mr-auto` في حاويات `/student`.
- ترتيب الطبقات في CSS كان يحتاج تثبيتًا بحيث تكون قواعد base/reset مبكرة، وتأتي utilities بعدها.

## التغييرات الدقيقة

### 1) frontend/src/app/globals.css
- السطر 4: تأكيد بقاء `@import "tailwindcss";` قبل القواعد المخصصة.
- الأسطر 45-70: نقل قواعد reset إلى `@layer base`:
  - `html`: إضافة `margin: 0` و`padding: 0`.
  - `*`: الإبقاء فقط على `box-sizing: border-box`.
  - `body`: الإبقاء على `margin: 0` و`padding: 0` مع باقي خصائص الجسم.
- تمت إزالة إعادة الضبط العامة القديمة من `*` (margin/padding).

### 2) frontend/src/app/student/layout.js
- السطر 37: استبدال `mx-auto` بـ `ml-auto mr-auto`.
- السطر 115: استبدال `mx-auto` بـ `ml-auto mr-auto`.
- السطر 121: استبدال `mx-auto` بـ `ml-auto mr-auto`.
- تم الحفاظ على `dir="rtl"` في `frontend/src/app/layout.js` كما هو.

### 3) frontend/src/components/student/explore/ExploreHeader.js
- السطر 4: تغيير `text-right` إلى `text-center`.
- السطر 7: تغيير `text-right` إلى `text-center`.

## التحقق والاختبارات

### تحقق بصري LTR/RTL
1. تشغيل السيرفر المحلي:
   - `npm run dev -- -p 3001`
2. فتح المسار:
   - `http://localhost:3001/student/explore`
3. فحص وضع RTL (الوضع النهائي):
   - تأكيد `html dir="rtl"` في الخرج.
4. فحص وضع LTR (تحقق مؤقت):
   - تم تبديل `app/layout.js` مؤقتًا إلى `lang="en" dir="ltr"` للتحقق، ثم إرجاعه مباشرة إلى `lang="ar" dir="rtl"`.
5. نتيجة متوقعة:
   - الحاويات ذات `max-w-7xl` تبقى في منتصف الصفحة في الوضعين.
   - لا يظهر انحراف أفقي للحاوية الرئيسية.

### تحقق ترتيب CSS النهائي
- تم التحقق من ملف CSS الناتج في وضع dev:
  - قواعد base/reset (`html`, `*`, `body`) ظهرت قبل utilities.
  - `.mx-auto` ظهر بعد reset.
  - `.ml-auto` و`.mr-auto` معرفتان كـ:
    - `.ml-auto { margin-left: auto; }`
    - `.mr-auto { margin-right: auto; }`
- لم تظهر قواعد لاحقة تعيد كتابة `margin-left/right` لعناصر `ml-auto mr-auto`.

### Regression
- `npm test -- --runInBand`: نجح (1 suite, 4 tests).
- فحص صفحات رئيسية تستخدم globals.css عبر HTTP:
  - `/` -> 200
  - `/student/explore` -> 200
  - `/student/my-courses` -> 200
  - `/student/profile` -> 200
  - `/instructor/dashboard` -> 200

## ملاحظات على البيئة
- `npm run build` يفشل بسبب مشكلة سابقة غير مرتبطة بهذه الحزمة:
  - `useSearchParams() should be wrapped in a suspense boundary at page "/"`
- `npm run lint` يفشل بسبب اعتماد مفقود في البيئة:
  - `Cannot find module 'typescript'`

## لقطات قبل/بعد (مطلوبة)
- قبل: صفحة `/student/explore` في RTL مع انحراف الحاوية يمينًا.
- بعد: نفس الصفحة مع تمركز ثابت للحاوية في RTL وLTR.
- أسماء اللقطات المقترحة:
  - `before-rtl-student-explore.png`
  - `after-rtl-student-explore.png`
  - `after-ltr-student-explore.png`
