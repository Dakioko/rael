/* ══════════════════════════════════════
   FIREBASE CONFIG — fill this in with YOUR project's values
   ══════════════════════════════════════

   Where to get these values:
   1. Go to https://console.firebase.google.com and create a free project
      (name it anything, e.g. "rael-memorial").
   2. In the project, click the "</>" (web app) icon to register a web app.
      No hosting setup needed — you're just grabbing the config object.
   3. Firebase will show you an object exactly like the one below.
      Copy your real values into it here.
   4. In the left sidebar, go to Build → Firestore Database → Create database.
      Choose "Start in production mode" (the security rules below handle
      access control, so this is safe) and pick any region.
   5. Once created, go to the "Rules" tab of Firestore and paste in:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /candles/{candleId} {
              allow read: if true;
              allow create: if
                request.resource.data.name is string &&
                request.resource.data.name.size() > 0 &&
                request.resource.data.name.size() <= 40 &&
                (!('message' in request.resource.data) ||
                  (request.resource.data.message is string &&
                   request.resource.data.message.size() <= 140)) &&
                request.resource.data.timestamp == request.time;
              allow update, delete: if false;
            }
          }
        }

      This lets anyone read the wall and add a candle, but nobody
      (including a technically-savvy visitor poking at devtools) can
      edit or delete an entry. To remove an inappropriate entry, go to
      Firestore Database → Data → candles collection, and delete that
      document manually. That's the entire moderation workflow.

   That's it — no server, no ongoing cost at this scale (Firestore's free
   tier is ~50,000 reads and ~20,000 writes per day).
*/

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBX91w15QnO1RxoAyFZJvkg7e-ItfZ_BY8",
  authDomain: "raelmemorial.firebaseapp.com",
  projectId: "raelmemorial",
  storageBucket: "raelmemorial.firebasestorage.app",
  messagingSenderId: "184293068283",
  appId: "1:184293068283:web:8ba22ddaeabc70f8fa8f5e"
};