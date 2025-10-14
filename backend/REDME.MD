جيد — هنمشي ببطء ونشرح كل حاجة بسيطة وبوضوح: ليه كتبت الـ schema بالطريقة دي، إزاي الـ OAuth اتربط مع الـ DB، وإيه الأخطاء اللي موجودة في كودك وأزاى تصلّحها. هديك كمان نسخة مصححة ومعلّقة من الكود في الآخر. نفسّر بالترتيب عشان الأمور تتجمع عندك.

# 1) ليه عملت `TokenSchema` و`MerchantSchema`؟

* `TokenSchema`
  هذا مخطط صغير (sub-schema) مخصص لتخزين التوكنات اللي بتيجي من Salla أو أي مزوّد OAuth:

  * `access_token`: لازم علشان تعمل طلبات محمية لـ API.
  * `refresh_token`: تستخدمه لو خلص الـ access token عشان تجيب واحد جديد.
  * `token_type`, `scope`: بيانات وصفية عن التوكن.
  * `expires_at`: وقت انتهاء صلاحية الـ access token (تحسبه من `expires_in`).
    خيار `{ _id: false }` معناه: مش عايز Mongo يولّد _id منفصل لهذا الجزء لأنّه مجرد حقل داخل `Merchant` وليس مستند مستقل.

* `MerchantSchema`
  هذا يمثل التاجر في قاعدة البيانات:

  * `sallaId` (عندك `sallaid` لكن الأفضل CamelCase): معرف مزوّد الخدمة، يُستخدم كبطاقة فريدة للربط.
  * `profile`: تخزن فيه بيانات التاجر (التي رجعتها واجهة `USER_INFO_URL`).
  * `token`/`tokens`: تخزن التوكنز باستخدام الـ `TokenSchema`.
  * `createdAt` و `updatedAt`: لتتبع الزمن.

`MerchantSchema.pre('save', ...)` يحدّث `updatedAt` كل مرة تحفظ الوثيقة عبر `.save()` — بهذا تضمن أن `updatedAt` يتغير أثناء الحفظ اليدوي.

# 2) إزاي ربطت الـ OAuth بالـ DB؟ (المنطق خطوة بخطوة)

1. تستلم `code` من callback بعد ما المستخدم وافق على صلاحيات التطبيق.
2. تبادل `code` على `TOKEN_URL` لتحصل `access_token` و`refresh_token` (هذا الـ `axios.post` + `qs.stringify`).
3. تحسب `expires_at` لو رجع `expires_in` (لـ تجديد لاحق).
4. تستخدم `access_token` لطلب `USER_INFO_URL` حتى تجيب `profile` للتاجر (إيميل، id، اسم... إلخ).
5. تختار مفتاح فريد للبحث في DB: `sallaId` لو موجود (الأفضل)، وإلا `profile.email` كـ fallback.
6. تعمل `findOneAndUpdate` مع `upsert: true` → يعني لو صاحب الـ id موجود حدث بياناته، ولو مش موجود أنشئ سجل جديد.
7. تجدد الجلسة (`req.session.regenerate()`) ثم تحط `req.session.merchantId = merchant._id` لربط الجلسة بهذا التاجر. هذي خطوة مهمة ضد session-fixation.
8. تحذف `req.session.oauthState` وتقوم بعمل redirect للمستخدم.

# 3) إيه الأخطاء/النقاط اللي محتاجة تصليح في كودك (نقاط عملية)

* **أخطاء كتابة بسيطة (typos):**

  * في schema: `Schema.types.Mixed` لازم تكون `Schema.Types.Mixed` (T كبيرة).
  * اسم الحقل: كتبت `sallaid` و`Profile` و`token`، ولكن في جزء التحديث تستعمل `sallaId` و`profile` و`tokens` — حافظ على نفس الأسماء (case-sensitive).
* **`findOneAndUpdate` لا يستدعي `pre('save')`**

  * معناه: الـ hook اللي محدث `updatedAt` لن يتم تفعيله عند `findOneAndUpdate`. لذلك مهم أنك في update تحدّث `updatedAt` بنفسك (زي ما عملت في `update` object).
* **فلتر يحتوي `undefined`**

  * تمرير `{ sallaId }` حيث `sallaId` قد يكون `null` أو `undefined` خطر. لو الفلتر يكون `{ sallaId: undefined }` ممكن يسبب سلوك غير متوقع. عشان كده بنفّذ الشروط `if (sallaId) ... else if (profile?.email) ... else create()` كما في المثال.
* **معالجة الأخطاء**

  * في `catch` عندك `catch (error)` لكن بعدين تستخدم `e.response` — لازم تستخدم نفس اسم المتغير (`error`) أو غيّر الـ catch إلى `catch (e)`.
* **تخزين التوكنات**

  * التوكنات (خصوصًا `refresh_token`) حساسة. لو النظام في إنتاج فكر في تشفيرها أو استخدام secret vault.
* **التحقق من وجود `access_token`**

  * ممتاز أنك تتأكدت من وجوده، لأن من غيره ما ينفع تكمل.

# 4) لماذا استخدمنا `upsert: true` و`setDefaultsOnInsert` و`runValidators`؟

* `upsert: true` — يسمح بإنشاء السجل لو مش موجود. مفيد لربط التاجر في أول مرة يدخل فيها التطبيق.
* `setDefaultsOnInsert: true` — لو دخلنا سجل جديد يطبق القيم الافتراضية اللي في الـ schema.
* `runValidators: true` — يشغّل قواعد الـ mongoose validation أثناء ال-update/upsert.
* `context: 'query'` — مهم لبعض الفاليديشنز التي تعتمد على `this` داخل الـ validators.

# 5) هل `pre('save')` كفاية لتحديث `updatedAt`؟

* لو تستخدم `doc.save()` فـ `pre('save')` يكفي. لكن لأنك تستخدم `findOneAndUpdate` (عملية مباشرة على الـ query)، فـ `pre('save')` **لن** تعمل. لذلك يجب:

  * إما تحديث `updatedAt` يدوياً في الـ `update` object (كما فعلت)، أو
  * تعريف `pre('findOneAndUpdate')` hook لتشغيل أي لوجيك تريده قبل `findOneAndUpdate`.

# 6) نسخة مصحّحة ومعلّقة من الكود (الموديل + جزء الـ callback)

أعطيك هنا كود مصحّح جاهز تلصقه— فيه تصحيح للأسماء، تعليقات، وتصحيح الـ catch:

**`models/Merchant.js` (مصحح):**

```js
import mongoose from "mongoose";
const { Schema } = mongoose;

const TokenSchema = new Schema({
  access_token: String,
  refresh_token: String,
  token_type: String,
  scope: String,
  expires_at: Date
}, { _id: false });

const MerchantSchema = new Schema({
  sallaId: { type: String, index: true, unique: true, sparse: true },
  profile: { type: Schema.Types.Mixed },
  tokens: TokenSchema,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

// هذا hook يتفعّل عند doc.save()
MerchantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// لو تحتاج نفس اللوجيك عند findOneAndUpdate يمكن تعريف pre('findOneAndUpdate')
MerchantSchema.pre('findOneAndUpdate', function(next) {
  // this هنا query، فبنحدّث الـ update object ليتضمن updatedAt
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.Merchant || mongoose.model("Merchant", MerchantSchema);
```

**الـ callback (مصحّح ومعلّق):**

```js
try {
  // تبادل code -> tokens
  const tokenRes = await axios.post(
    TOKEN_URL,
    qs.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const tokens = tokenRes.data || {};
  if (!tokens.access_token) {
    throw new Error('No access_token in token response');
  }
  if (tokens.expires_in) {
    tokens.expires_at = new Date(Date.now() + tokens.expires_in * 1000);
  }

  // جلب بروفايل التاجر
  const profileRes = await axios.get(USER_INFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = profileRes.data || {};

  // بناء فلتر/تحديث آمن
  const sallaId = profile?.merchant?.id || profile?.id || null;
  const update = {
    profile,
    tokens,
    'tokens.expires_at': tokens.expires_at,
    updatedAt: new Date()
  };
  const opts = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
    context: 'query'
  };

  let merchant;
  if (sallaId) {
    // استخدم معرف المزود لو موجود
    merchant = await Merchant.findOneAndUpdate({ sallaId }, update, opts);
  } else if (profile?.email) {
    // fallback على الايميل
    merchant = await Merchant.findOneAndUpdate({ 'profile.email': profile.email }, update, opts);
  } else {
    // لا يوجد مفتاح آمن -> أنشئ سجل جديد صريح
    merchant = await Merchant.create({ profile, tokens });
  }

  // تجديد الجلسة لحماية من session-fixation
  await new Promise((resolve, reject) => {
    req.session.regenerate(err => (err ? reject(err) : resolve()));
  });
  req.session.merchantId = merchant._id;
  delete req.session.oauthState;

  return res.redirect('/me');
} catch (err) {
  // لاحظ استخدام err هنا (بدل e أو error غير متطابق)
  const msg = err.response?.data || err.message || err;
  console.error("Token exchange or profile fetch failed:", msg);
  return res.status(500).send("❌ Token exchange failed");
}
```

# 7) نصائح أخيرة مبسطة وسهلة التطبيق

* ثبّت أسماء الحقول (case-sensitive) — `sallaId` و`profile` و`tokens` يجب أن تكون موحّدة في الموديل والكود.
* فعّل `pre('findOneAndUpdate')` لو عندك منطق في `pre('save')` وتحتاجه عند التحديثات بالـ query.
* فكّر بتشفير `refresh_token` إن المشروع سينتقل للإنتاج.
* لا تعطي رسائل خطأ تفصيلية للمستخدم في الإنتاج — سجّلها داخليًا فقط.
* اختبر السيناريوهات: أول تسجيل، تسجيل ثاني بنفس الحساب، سيناريو بدون email أو بدون sallaId.

---

خلاصة قصيرة:
أنت صنعت هيكل منطقي: تخزين التوكنز، جلب البروفايل، وupsert للتاجر. الخلل كان في بعض الأسماء والحاجة لفهم أن `findOneAndUpdate` لا يستدعي `pre('save')`، لذلك عدّلنا الكود ليكون آمناً وصحيحًا. الآن الكود المصحح يعمل مع حالات fallback ويجدد الجلسة بأمان.

لو تحب، أقدر أجهّز ملف واحد جاهز (مصحّح بالكامل) يمكنك نسخه في مشروعك، أو أضبط لك وظيفة لتشفير `refresh_token` أو مثال بسيط لإعادة تجديد التوكن تلقائيًا قبل انتهاء صلاحيته — هأعمله لك مباشرة.
