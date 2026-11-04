# ربط Firebase بمنصة وَنَس

## ما تم ربطه في الكود

- تطبيق Flutter: حزمة `firebase_core` و`firebase_auth` و`firebase_messaging`،
  وخدمة `lib/services/firebase_service.dart`، وتهيئة عند بدء التطبيق في
  `lib/main.dart`. إذا لم يكن Firebase مهيأً لهذا البناء، يستمر التطبيق
  بالمصادقة الخلفية (JWT) فقط، ولا يدّعي أن Firebase متصل.
- الخادم: `backend/src/services/firebase.js` للتحقق من رمز Firebase على
  الخادم فقط، ومسار `POST /api/auth/firebase` الذي يتحقق من الرمز ثم
  يصدر رمز JWT خلفياً. إذا لم تكن خدمة Firebase Admin مهيأة، يرجع
  المسار 503 بسبب واضح، ولا ينشئ جلسة من ادعاء غير موثّق.
- الإشعارات: إرسال FCM من الخادم عبر Firebase Admin عند توفره فقط.

## ما لم يتم تضمينه عمداً في المشروع أو في ZIP

لا يوجد أي مفتاح حقيقي، ولا ملف `google-services.json` حقيقي، ولا
`GoogleService-Info.plist` حقيقي، ولا ملف حساب خدمة، داخل المشروع أو
داخل ZIP. ملف `.gitignore` يستبعد `google-services.json` و
`GoogleService-Info.plist` و`.env` أصلاً. لا ترسل هذه الملفات إلى
مستودع عام، ولا تلصق مفاتيحها في محادثة.

## خطوات الربط على جهازك

1. ضع ملف `google-services.json` الحقيقي في
   `flutter_app/android/app/google-services.json` محلياً فقط.
2. ضع ملف `GoogleService-Info.plist` الحقيقي في
   `flutter_app/ios/Runner/GoogleService-Info.plist` محلياً فقط عند بناء iOS.
3. عند الحاجة، شغّل `flutterfire configure` لتوليد إعدادات الويب، ولا
   تلصق المفاتيح يدوياً في الكود.
4. في لوحة Vercel، أضف متغير البيئة `FIREBASE_SERVICE_ACCOUNT_JSON`
   (محتوى JSON لحساب الخدمة كاملاً كقيمة متغير بيئة)، و`FIREBASE_PROJECT_ID`.
   لا تضع أياً منهما في المستودع.
5. في الخادم، إذا أردت التحقق عبر Firebase Admin، ثبّت الحزمة:
   `npm install firebase-admin` داخل `backend/` قبل النشر، لأنها
   اختيارية في نسخة البداية ولا تُشغّل التطبيق بدونها.

## أمان مفتاح الويب

مفتاح Firebase للويب هو معرّف عميل، لكن يجب تقييده في Google Cloud
Console: قيّده بتطبيقات Android/iOS الخاصة بك وبواجهات Firebase
المستخدمة فقط. إذا ظهر المفتاح في محادثة عامة أو مستودع عام، قيّده
فوراً، وراجع الاستخدام، ودوّره إذا لزم الأمر. لا تعيد إرسال المفاتيح
في الشات؛ استخدم متغيرات البيئة ولوحة Vercel.

## اختبار الربط

1. سجّل الدخول من التطبيق عبر Firebase.
2. احصل على رمز Firebase من التطبيق، ثم أرسله إلى
   `POST /api/auth/firebase` مع `{ "idToken": "..." }`.
3. يجب أن يرجع الخادم رمز JWT خلفياً عند نجاح التحقق، أو 503 بسبب
   واضح عند عدم تهيئة Firebase Admin.
