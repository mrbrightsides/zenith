
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Helper to validate if a string is a real value
const isValidConfigString = (val: any) => {
  return typeof val === 'string' && val.trim() !== '' && val !== 'undefined' && val !== 'null';
};

let firebaseApp: any = null;
export let auth: any = null;
export let db: any = null;

// Initial diagnostics based on build-time env
const buildTimeDiagnostics = {
  projectId: isValidConfigString(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  apiKey: isValidConfigString(import.meta.env.VITE_FIREBASE_API_KEY),
  isFullyConfigured: isValidConfigString(import.meta.env.VITE_FIREBASE_PROJECT_ID) && isValidConfigString(import.meta.env.VITE_FIREBASE_API_KEY)
};

const initFirebase = (config: any) => {
  if (getApps().length > 0) return;
  try {
    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("ZENITH CLOUD: Firebase initialized successfully.");
  } catch (error) {
    console.error("ZENITH CLOUD: Firebase Init Error:", error);
  }
};

// Try build-time config first
if (buildTimeDiagnostics.isFullyConfigured) {
  initFirebase({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  });
}

// Runtime config fetcher
export const synchronizeCloudConfig = async () => {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (config.isCloudConfigured && !firebaseApp) {
      initFirebase(config.firebase);
      return true;
    }
    return !!firebaseApp;
  } catch (e) {
    console.warn("ZENITH CLOUD: Failed to fetch runtime config.");
    return !!firebaseApp;
  }
};

export const getFirebaseDiagnostics = () => {
  return {
    isConfigured: !!db && !!auth,
    usingRuntimeConfig: !!firebaseApp && !buildTimeDiagnostics.isFullyConfigured,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Runtime Configured'
  };
};

export class GoogleCloudService {
  static isConfigured(): boolean {
    return !!db && !!auth;
  }

  static async saveCampaign(goal: string, narrative: string, imageUrl: string, videoUrl: string) {
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
