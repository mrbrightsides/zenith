
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

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
    isFullyConfigured: !!import.meta.env.VITE_FIREBASE_PROJECT_ID && !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET && !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID && !!import.meta.env.VITE_FIREBASE_APP_ID && !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};

const diagnostics = getFirebaseDiagnostics();
const isConfigured = diagnostics.isFullyConfigured;

let app: firebase.app.App | null = null;
if (isConfigured) {
  try {
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.apps[0];
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

// Fix: Use compat API to resolve missing member errors
export const auth = app ? app.auth() : null;
export const db = app ? app.firestore() : null;

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
      // Fix: Use compat API for firestore operations
      const docRef = await db!.collection("campaigns").add({
        userId: auth.currentUser.uid,
        goal,
        narrative,
        imageUrl,
        videoUrl,
        createdAt: firebase.firestore.Timestamp.now()
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
      // Fix: Use compat API for firestore queries
      const querySnapshot = await db!.collection("campaigns")
        .where("userId", "==", auth.currentUser.uid)
        .orderBy("createdAt", "desc")
        .get();
        
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
