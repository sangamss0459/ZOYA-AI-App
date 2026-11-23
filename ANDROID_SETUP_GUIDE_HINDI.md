# ZOYA AI — Beginner-Friendly Setup, Android APK & Play Store AAB Guide (सरल हिंदी में)

नमस्ते! यह गाइड बिल्कुल आसान हिंदी में लिखी गई है ताकि बिना कोडिंग जाने और **बिना कंप्यूटर के सिर्फ़ अपने Android फोन से** भी आप **ZOYA AI** की असली `.apk` फ़ाइल बना सकें और इंस्टॉल कर सकें।

---

## 0. सिर्फ़ Android फोन से Cloud APK Build कैसे करें (बिना PC / Android Studio के)

यह सबसे सुरक्षित तरीका है क्योंकि आपका पूरा वेब प्रोजेक्ट जैसा है वैसा ही सुरक्षित रहता है और GitHub के क्लाउड सर्वर पर `.apk` अपने-आप बनती है।

### Step 1: GitHub पर सुरक्षित Private Repository बनाएं
1. अपने फोन के **Chrome ब्राउज़र** में `https://github.com` खोलें और लॉगिन (या नया अकाउंट बनाएं)।
2. ऊपर दाईं तरफ **`+`** आइकन पर टैप करें -> **New repository** चुनें।
3. नाम लिखें (जैसे `zoya-ai-app`), **Private** चुनें (ताकि कोड प्राइवेट रहे), और **Create repository** दबाएं।

### Step 2: प्रोजेक्ट को GitHub पर डालें
1. AI Studio से अपना पूरा प्रोजेक्ट डाउनलोड करके (या GitHub कनेक्शन से) अपनी नई repository में अपलोड करें।
2. ध्यान रखें कि `.github/workflows/build-android-apk.yml` फ़ाइल भी repository में मौजूद हो (यह पहले से प्रोजेक्ट में जोड़ दी गई है)।

### Step 3: Cloud में APK Build चलाएं
1. अपनी GitHub repository के पेज पर ऊपर **Actions** टैब पर टैप करें।
2. बाईं तरफ (या लिस्ट में) **Build ZOYA Android APK** पर टैप करें।
3. **Run workflow** बटन दबाएं -> अंदर फिर से हरे रंग का **Run workflow** बटन दबाएं।
4. लगभग **3–5 मिनट** इंतज़ार करें जब तक हरा टिक (✅) न आ जाए।

### Step 4: APK डाउनलोड करें और फोन में इंस्टॉल करें
1. हरे टिक (✅) वाले workflow रन पर टैप करें।
2. पेज के सबसे नीचे **Artifacts** सेक्शन में जाएं और **`zoya-ai-debug-apk`** पर टैप करके ZIP डाउनलोड करें।
3. अपने फोन के **Files / File Manager** ऐप में जाकर उस ZIP को **Extract / Unzip** करें।
4. अंदर मिली **`app-debug.apk`** फ़ाइल पर टैप करें।
5. अगर फोन पूछे *"Install unknown apps"* या *"Allow from this source"*, तो उसे **Allow** करें और **Install** दबाएं।
6. अब **ZOYA AI** आपके फोन के ऐप ड्रॉअर में आ जाएगी! ऐप खोलकर **Mic** दबाएं और माइक्रोफ़ोन की अनुमति **Allow while using the app** चुनें।

---

## 1. सबसे पहले: AI Studio में ही तुरंत चलाएं (Web + Mobile PWA)

1. दाईं तरफ **Settings > Secrets** में जाएं और चेक करें कि `GEMINI_API_KEY` सेट है (AI Studio इसे सुरक्षित रूप से अपने सर्वर पर रखता है)।
2. ऐप खुलने पर बीच वाले **Mic बटन** या **Glowing Orb** पर टैप करें।
3. ब्राउज़र आपसे **Microphone** की अनुमति मांगेगा — **Allow** पर क्लिक करें।
4. **Gmail पढ़ने/भेजने के लिए:** ऊपर दाईं तरफ **Connect Gmail** बटन दबाएं और अपने Google अकाउंट से Sign in करें। (ZOYA बिना आपके Confirm किए कभी कोई ईमेल नहीं भेजेगी।)
5. **Android फोन की Home Screen पर ऐप जैसा आइकन लगाने के लिए:**
   - अपने फोन के **Chrome ब्राउज़र** में इस ऐप का लिंक खोलें।
   - ऊपर दाईं तरफ **3 डॉट्स (⋮)** पर क्लिक करें।
   - **Add to Home screen** या **Install app** पर क्लिक करें।
   - अब ZOYA AI आपके फोन के App Drawer और Home Screen पर दिखने लगेगी!

---

## 2. अपने कंप्यूटर पर ZOYA AI चलाना (Local Setup)

1. अपने कंप्यूटर पर **Node.js (v20 या नया)** डाउनलोड करके इंस्टॉल करें (`https://nodejs.org`)।
2. प्रोजेक्ट फ़ोल्डर में एक `.env` फ़ाइल बनाएं (`.env.example` की कॉपी बनाकर) और उसमें अपनी `GEMINI_API_KEY` डालें।
3. प्रोजेक्ट फ़ोल्डर में टर्मिनल खोलें और ये 2 कमांड चलाएं:
   - पहला कमांड: `npm install` (सारी ज़रूरी फाइलें डाउनलोड करने के लिए)
   - दूसरा कमांड: `npm run dev` (ऐप को port 3000 पर चालू करने के लिए)
4. ब्राउज़र में `http://localhost:3000` खोलें।

---

## 3. असली Android APK और Play Store AAB कैसे बनाएं?

> **जरूरी जानकारी:** इस क्लाउड प्रीव्यू सर्वर में Android SDK / Gradle इंस्टॉल नहीं है, इसलिए `.apk` और `.aab` फ़ाइल आपके कंप्यूटर पर **Android Studio** के ज़रिए बनेगी। पूरा Android प्रोजेक्ट (`/android` फ़ोल्डर और `capacitor.config.ts`) पहले से तैयार कर दिया गया है!

### Step 1: Android Studio इंस्टॉल करें
- Google की आधिकारिक वेबसाइट (`https://developer.android.com/studio`) से **Android Studio** डाउनलोड करके इंस्टॉल करें।

### Step 2: Capacitor Android Sync चलाएं
अपने प्रोजेक्ट फ़ोल्डर में ये कमांड चलाएं:
1. `npm install`
2. `npm install @capacitor/cli @capacitor/android`
3. `npm run build`
4. `npx cap sync android`

*(अगर बैकएंड सर्वर ऑनलाइन होस्ट है जैसे Cloud Run URL पर, तो `capacitor.config.ts` में `server: { url: "https://आपका-APP_URL" }` जोड़ें ताकि फोन ऐप सीधे आपके लाइव Gemini Live सर्वर से बात कर सके।)*

### Step 3: Android Studio में प्रोजेक्ट खोलें
1. Android Studio खोलें -> **Open** पर क्लिक करें।
2. अपने प्रोजेक्ट के अंदर वाला **`android`** फ़ोल्डर चुनें और **OK** दबाएं।
3. नीचे दाईं तरफ Gradle Sync पूरा होने का इंतज़ार करें (1–2 मिनट लग सकते हैं)।

### Step 4: फोन में इंस्टॉल होने वाला APK बनाएं
1. ऊपर मेनू में **Build** पर क्लिक करें।
2. **Build Bundle(s) / APK(s)** -> **Build APK(s)** पर क्लिक करें।
3. पूरा होने पर नीचे दाईं तरफ **locate** लिंक आएगा — क्लिक करने पर `app-debug.apk` मिल जाएगा। इसे अपने फोन में भेजकर इंस्टॉल करें!

### Step 5: Play Store के लिए Signed AAB बनाएं
1. ऊपर मेनू में **Build** -> **Generate Signed Bundle / APK...** पर क्लिक करें।
2. **Android App Bundle** चुनकर **Next** दबाएं।
3. **Create new...** पर क्लिक करके अपनी Keystore फ़ाइल और पासवर्ड बनाएं (इसे सुरक्षित रखें!)।
4. **release** चुनकर **Finish** दबाएं — आपको `app-release.aab` मिल जाएगी जिसे Play Console पर अपलोड किया जा सकता है।

---

## 4. Android फोन में Permissions कैसे सेट करें?

1. **Microphone:** पहली बार Mic बटन दबाने पर **Allow while using the app** चुनें।
2. **Screen Sharing (MediaProjection):** "Zoya, meri screen dekho" बोलने या Screen Share बटन दबाने पर Android का सिस्टम पॉपअप आएगा — **Start now** दबाएं। ऊपर Notification में हमेशा Stop बटन रहेगा।
3. **Accessibility Service (सिर्फ़ अगर ऑन-स्क्रीन क्लिक/स्क्रॉल चाहिए):**
   - फोन की **Settings > Accessibility > Installed apps > ZOYA AI Voice Navigation** खोलें और ऑन करें। (यह पूरी तरह आपकी मर्ज़ी पर है और कभी भी बंद किया जा सकता है।)
4. **Quick Settings Tile:** फोन का Notification पैनल नीचे खींचें -> Edit (पेंसिल आइकन) दबाएं -> **ZOYA AI** टाइल को ऊपर खींचकर लगाएं।
