
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Helper to validate if a string is a real value and not a "placeholder" or "undefined" from build tools
const isValidConfigString = (val: any) => {
  return typeof val === 'string' && val.trim() !== '' && val !== 'undefined' && val !== 'null';
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const getFirebaseDiagnostics = () => {
  return {
    projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    isFullyConfigured: !!import.meta.env.VITE_FIREBASE_PROJECT_ID && !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};

const diagnostics = getFirebaseDiagnostics();
const isConfigured = diagnostics.isFullyConfigured;

let app = null;
if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export class GoogleCloudService {
  static isConfigured(): boolean {
    // App is configured only if Firebase initialized successfully and all keys are valid
    return !!db && !!auth && diagnostics.isFullyConfigured;
  }

  static async saveCampaign(goal: string, narrative: string, imageUrl: string, videoUrl: string) {
    // If not logged in or cloud not configured, fallback to local immediately
    if (!this.isConfigured() || !auth?.currentUser) {
      this.saveToLocal(goal, narrative, imageUrl, videoUrl);
      return null;
    }

    try {
      const docRef = await addDoc(collection(db!, "campaigns"), {
        userId: auth.currentUser.uid,
        goal,
        narrative,
        imageUrl,
        videoUrl,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("GCP Cloud Save Error:", error);
      // Even on cloud error, save locally as a safety measure
      this.saveToLocal(goal, narrative, imageUrl, videoUrl);
      return null;
    }
  }

  private static saveToLocal(goal: string, narrative: string, imageUrl: string, videoUrl: string) {
    const local = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]');
    local.push({ id: Date.now().toString(), goal, narrative, imageUrl, videoUrl, createdAt: new Date() });
    localStorage.setItem('zenith_campaign_fallback', JSON.stringify(local.slice(-10)));
  }

  static async getCampaigns() {
    // Attempt cloud fetch, otherwise return local
    if (!this.isConfigured() || !auth?.currentUser) {
      const local = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]');
      return [...local].reverse();
    }

    try {
      const q = query(
        collection(db!, "campaigns"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error("GCP Cloud Fetch Error:", error);
      const local = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]');
      return [...local].reverse();
    }
  }
}
