
import { Course, User } from "../types";
import * as firebaseApp from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdGyLPG47pb4p_T6SWP26hz6fcw-1563c",
  authDomain: "orbis-210d4.firebaseapp.com",
  projectId: "orbis-210d4",
  storageBucket: "orbis-210d4.firebasestorage.app",
  messagingSenderId: "764870052434",
  appId: "1:764870052434:web:3e2245cecbcf4799662d8b"
};

// Initialize Firebase
let app: any;
let auth: any;
let db: any;

try {
    const init = (firebaseApp as any).initializeApp || (firebaseApp as any).default?.initializeApp;
    if (init) {
        app = init(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        console.error("Firebase initializeApp could not be found.");
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// Simple string hash to detect similar syllabus content
export const generateSyllabusHash = (text: string): string => {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 500); // First 500 chars normalized
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export const CloudService = {
  
  signInWithGoogle: async (): Promise<User> => {
    if (!auth) throw new Error("Firebase not initialized");
    
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        
        // Check if user exists in DB to get their Tier
        let tier: 'FREE' | 'PRO' = 'FREE';
        if (db) {
            const userRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                tier = userData.tier || 'FREE';
            } else {
                // Create new user record
                await setDoc(userRef, {
                    email: fbUser.email,
                    tier: 'FREE',
                    createdAt: Date.now()
                });
            }
        }

        return {
            id: fbUser.uid,
            name: fbUser.displayName || 'Anonymous',
            email: fbUser.email || '',
            avatarUrl: fbUser.photoURL || '',
            tier: tier
        };
    } catch (error: any) {
        console.error("Sign In Error:", error);
        throw error;
    }
  },

  signOut: async () => {
    if (auth) {
        await firebaseSignOut(auth);
    }
  },

  subscribeToAuthChanges: (callback: (user: User | null) => void): () => void => {
    if (!auth) {
        // If auth isn't initialized, just return a dummy unsubscribe and call with null
        setTimeout(() => callback(null), 0);
        return () => {};
    }

    return onAuthStateChanged(auth, async (fbUser: any) => {
        if (!fbUser) {
            callback(null);
        } else {
             // Check Firestore for user details (like Tier)
             let tier: 'FREE' | 'PRO' = 'FREE';
             if (db) {
                 try {
                    const userRef = doc(db, "users", fbUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        tier = userSnap.data().tier || 'FREE';
                    }
                 } catch(e) {
                     console.error("Error fetching user tier", e);
                 }
             }

             callback({
                id: fbUser.uid,
                name: fbUser.displayName || 'Anonymous',
                email: fbUser.email || '',
                avatarUrl: fbUser.photoURL || '',
                tier: tier
            });
        }
    });
  },

  // Simulates a payment gateway callback
  upgradeUserToPro: async (userId: string): Promise<void> => {
      if (!db) return;
      try {
          await setDoc(doc(db, "users", userId), { tier: 'PRO' }, { merge: true });
      } catch (e) {
          console.error("Upgrade failed", e);
      }
  },

  // --- CLOUD SYNC FOR USER COURSES ---

  saveUserCourse: async (userId: string, course: Course) => {
      if (!db) return;
      try {
          // Clone and Sanitize
          // Firestore has a 1MB limit. Base64 Videos/Images are too big.
          // We strip them out for Cloud Sync. 
          // On a new device, the app sees "Ready" but missing assets, and can offer to regenerate.
          const courseToSave = JSON.parse(JSON.stringify(course));
          
          courseToSave.reels = courseToSave.reels.map((reel: any) => {
              const { videoUri, audioUri, imageUri, ...rest } = reel;
              // We only sync structure, script, prompts, and progress.
              // Heavy media stays local (IndexedDB) or needs Firebase Storage (Blob) integration.
              return rest;
          });

          const courseRef = doc(db, "users", userId, "courses", course.id);
          await setDoc(courseRef, courseToSave);
      } catch (e) {
          console.error("Failed to sync course to cloud:", e);
      }
  },

  getUserCourses: async (userId: string): Promise<Course[]> => {
      if (!db) return [];
      try {
          const q = query(collection(db, "users", userId, "courses"));
          const snapshot = await getDocs(q);
          const courses: Course[] = [];
          snapshot.forEach(doc => {
              courses.push(doc.data() as Course);
          });
          return courses.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
      } catch (e) {
          console.error("Failed to fetch cloud courses:", e);
          return [];
      }
  },

  deleteUserCourse: async (userId: string, courseId: string) => {
      if (!db) return;
      try {
          await deleteDoc(doc(db, "users", userId, "courses", courseId));
      } catch (e) {
          console.error("Failed to delete cloud course", e);
      }
  },

  // --- PUBLIC LIBRARY ---

  // Check if a course with this syllabus already exists
  findPublicCourseMatch: async (syllabusHash: string): Promise<Course | null> => {
    return CloudService.getPublicCourseByHash(syllabusHash);
  },

  getPublicCourseByHash: async (syllabusHash: string): Promise<Course | null> => {
    if (!db) return null;
    try {
        // First try fetching directly by ID if syllabusHash is used as document key
        const docRef = doc(db, "public_courses", syllabusHash);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
             return docSnap.data() as Course;
        }

        // Fallback: Query by field if key isn't the hash
        const q = query(
            collection(db, "public_courses"), 
            where("syllabusHash", "==", syllabusHash)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as Course;
        }
        return null;
    } catch (e) {
        console.warn("Cloud library search failed", e);
        return null;
    }
  },

  // Upload a finished course to the public cloud
  publishCourseToLibrary: async (course: Course) => {
    if (!db) return;
    try {
        // We store it in a 'public_courses' collection
        // We use syllabusHash as ID to ensure uniqueness/deduplication
        if (course.syllabusHash) {
             // Deep sanitize to remove undefined values which Firestore hates
             const cleanCourse = JSON.parse(JSON.stringify(course));
             
             // Strip heavy assets for public library too to save bandwidth
             cleanCourse.reels = cleanCourse.reels.map((reel: any) => {
                 const { videoUri, audioUri, imageUri, ...rest } = reel;
                 return rest;
             });
             
             await setDoc(doc(db, "public_courses", course.syllabusHash), {
                 ...cleanCourse,
                 isPublic: true,
                 ownerId: 'public_library' // Anonymize ownership for the public index
             });
             console.log("Course published to Public Library");
        }
    } catch (e) {
        console.warn("Failed to publish course", e);
    }
  },

  // Send email notification (Simulation - Requires backend Cloud Function usually)
  sendCompletionEmail: async (email: string, courseTitle: string) => {
    // In a real app, this would trigger a Firebase Cloud Function or EmailJS
    console.log(`[CLOUD FUNCTION TRIGGER] Send email to ${email}: Your course "${courseTitle}" is ready.`);
  }
};
