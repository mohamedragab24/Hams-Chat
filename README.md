# Wanas Admin — لوحة تحكم وَنَس

لوحة تحكم Node.js + Express للمنصة الاجتماعية الترفيهية وَنَس، جاهزة للنشر على Vercel.

## ما فيها

- لوحة تحكم عربية RTL في `public/admin/` (نظرة عامة، مستخدمون، غرف، محتوى، كتالوج، محفظة، وكالات/مضيفون/شحن، ألعاب، مزرعة، عائلات، فعاليات، مهام، بلاغات، حظر، دعم، أدوار، إعدادات).
- واجهات API في `src/routes/`، ومنها `POST /api/auth/firebase` للتحقق من رمز Firebase على الخادم فقط.
- كتالوجات الهدايا ودخوليات الغرف والإطارات بصيغ SVGA وMP4 وGIF وPNG، مع التحقق من نوع الملف الحقيقي.
- سجل محاسبي لا يتعدل، وحظر وفك حظر مع سجل تدقيق.

## التشغيل محلياً

```bash
npm install
npm start
```

لوحة التحكم: `http://localhost:3000/admin`
فحص الصحة: `http://localhost:3000/api/health`

## النشر على Vercel

هذا المستودع نفسه قابل للنشر على Vercel كما هو، لأن `api/index.js` هو نقطة دخول serverless و`vercel.json` يحوّل `/admin` و`/api/*` إليها.

## متغيرات البيئة — أسماء فقط، بدون قيم

اضبطها في لوحة Vercel، ولا تضعها أبداً في المستودع:

- `DATABASE_URL` — PostgreSQL (بدونها يعمل الخادم في وضع تجريبي مؤقت فقط)
- `REDIS_URL`
- `JWT_SECRET`
- `AGORA_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` — محتوى JSON لحساب خدمة Firebase Admin، مطلوب للتحقق من رموز Firebase وإرسال FCM من الخادم
- `FIREBASE_PROJECT_ID`
- `S3_BUCKET` وغيرها حسب الحاجة (انظر المشروع الكامل في مستودع `wanas`)

## أمان

لا يوجد أي مفتاح حقيقي أو ملف `google-services.json` أو حساب خدمة داخل هذا المستودع. ملف `.gitignore` يستبعد `.env` و`google-services.json` و`GoogleService-Info.plist` و`node_modules`.

## حالة نسخة البداية

هذه نسخة بداية كاملة البنية، وليست جاهزة للمتجر قبل ربط قاعدة بيانات حقيقية ومفاتيح الخدمات الخارجية ومراجعة المتاجر.
