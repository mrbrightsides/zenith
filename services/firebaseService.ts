
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Helper to validate if a string is a real value and not a placeholder
const isValidConfigString = (val: any) => {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  const placeholders = ['your_api_key_here', 'your_project_id_here', 'undefined', 'null', ''];
  return trimmed !== '' && !placeholders.includes(trimmed.toLowerCase());
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
  
  // Strict validation before calling initializeApp to prevent "invalid-api-key" errors
  if (!isValidConfigString(config.apiKey) || !isValidConfigString(config.projectId)) {
    console.warn("ZENITH CLOUD: Firebase configuration is incomplete or contains placeholders. Skipping initialization.");
    return;
  }

  try {
    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("ZENITH CLOUD: Firebase initialized successfully with Project ID:", config.projectId);
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
    console.log("ZENITH CLOUD: Attempting to save campaign...", { goal, narrativeLength: narrative?.length, hasImage: !!imageUrl, hasVideo: !!videoUrl });
    
    if (!this.isConfigured() || !auth?.currentUser) {
      console.warn("ZENITH CLOUD: Save aborted - Not configured or no user.", { isConfigured: this.isConfigured(), hasUser: !!auth?.currentUser });
      this.saveToLocal(goal, narrative, imageUrl, videoUrl);
      return null;
    }

    // Firestore has a 1MB limit per document. Base64 assets (especially video) often exceed this.
    // We'll save the full data to LocalStorage (fallback) but truncate for the Cloud Index if too large.
    let cloudNarrative = narrative;
    let cloudImageUrl = imageUrl;
    let cloudVideoUrl = videoUrl;

    const ESTIMATED_SIZE = (narrative?.length || 0) + (imageUrl?.length || 0) + (videoUrl?.length || 0);
    const MAX_FIRESTORE_SIZE = 800000; // ~800KB safety limit

    if (ESTIMATED_SIZE > MAX_FIRESTORE_SIZE) {
      console.warn(`ZENITH CLOUD: Payload (${Math.round(ESTIMATED_SIZE/1024)}KB) exceeds Firestore limits. Optimizing for index...`);
      // Prioritize narrative, then image, then video
      if (cloudVideoUrl?.length > 100000) {
        cloudVideoUrl = "ASSET_TOO_LARGE_FOR_INDEX"; // Placeholder
      }
      if ((cloudNarrative?.length + cloudImageUrl?.length + cloudVideoUrl?.length) > MAX_FIRESTORE_SIZE) {
        if (cloudImageUrl?.length > 100000) {
          cloudImageUrl = "ASSET_TOO_LARGE_FOR_INDEX";
        }
      }
    }

    try {
      const docRef = await addDoc(collection(db!, "campaigns"), {
        userId: auth.currentUser.uid,
        goal,
        narrative: cloudNarrative,
        imageUrl: cloudImageUrl,
        videoUrl: cloudVideoUrl,
        isTruncated: ESTIMATED_SIZE > MAX_FIRESTORE_SIZE,
        createdAt: Timestamp.now()
      });
      
      // Always save full version to local storage as well for immediate high-quality recall
      this.saveToLocal(goal, narrative, imageUrl, videoUrl);
      
      console.log("ZENITH CLOUD: Campaign indexed successfully with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("ZENITH CLOUD: Save Error:", error);
      this.saveToLocal(goal, narrative, imageUrl, videoUrl);
      return null;
    }
  }

  private static saveToLocal(goal: string, narrative: string, imageUrl: string, videoUrl: string) {
    let local = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]');
    // Deduplicate by goal to keep history clean
    local = local.filter((item: any) => item.goal !== goal);
    local.push({ id: Date.now().toString(), goal, narrative, imageUrl, videoUrl, createdAt: new Date() });
    localStorage.setItem('zenith_campaign_fallback', JSON.stringify(local.slice(-10)));
  }

  static async getCampaigns() {
    const local = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]');

    if (!this.isConfigured() || !auth?.currentUser) {
      return [...local].reverse();
    }

    try {
      const q = query(
        collection(db!, "campaigns"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const cloudDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date()
      }));

      // Merge logic: If cloud asset is truncated, try to restore from local storage
      return cloudDocs.map((c: any) => {
        if (c.isTruncated) {
          const localMatch = local.find((l: any) => l.goal === c.goal);
          if (localMatch) {
            return { 
              ...c, 
              narrative: localMatch.narrative || c.narrative,
              imageUrl: localMatch.imageUrl && localMatch.imageUrl !== "ASSET_TOO_LARGE_FOR_INDEX" ? localMatch.imageUrl : c.imageUrl,
              videoUrl: localMatch.videoUrl && localMatch.videoUrl !== "ASSET_TOO_LARGE_FOR_INDEX" ? localMatch.videoUrl : c.videoUrl,
              isRestored: true 
            };
          }
        }
        return c;
      });
    } catch (error) {
      console.error("ZENITH CLOUD: Fetch Error:", error);
      return [...local].reverse();
    }
  }
}
