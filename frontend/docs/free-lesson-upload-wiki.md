# Internal Wiki: Free Lesson Upload

## Feature Summary

Teachers can mark a lesson/course as free during upload. When enabled:

- Price is forced to `0`
- Price inputs are hidden
- Public listings show a `FREE` badge
- Students can enroll without uploading payment receipts

## Analytics

- Event name: `free_lesson_upload`
- Trigger points:
  - Save course details with free toggle enabled
  - Save pricing step with free toggle enabled
- Event payload fields:
  - `courseId`
  - `courseCode`
  - `price`
  - `timestamp`

## API Rules

- `is_free_lesson=true` requires `price=0`
- `is_free_lesson=false` requires `price>0`
- Invalid combinations return `400 Bad Request`

## Access Rules

- Upload endpoints require authenticated `instructor` role
- Student role receives `403 Access denied`

## QA Checklist

- Teacher can toggle free mode and keep value after save
- FREE badge appears in:
  - Explore lesson list cards
  - Lesson detail page
  - My courses cards
- Free lessons appear under `الدروس المجانية` filter
- Paid lessons still require receipt upload
- Free lessons enroll directly with approved status

## User FAQ

### ما هو الدرس المجاني؟
الدرس المجاني هو درس يتم نشره بسعر 0 ويظهر للطلاب بشارة FREE.

### هل أحتاج إعداد وسيلة دفع للدرس المجاني؟
لا، الدرس المجاني لا يتطلب إعداد وسيلة دفع قبل النشر.

### هل يمكن تحويل الدرس من مدفوع إلى مجاني؟
نعم، فعّل خيار الدرس المجاني وسيتم ضبط السعر تلقائيًا إلى 0.

### ماذا يرى الطالب عند الدرس المجاني؟
يرى شارة FREE ويمكنه التسجيل مباشرة بدون رفع إيصال دفع.
