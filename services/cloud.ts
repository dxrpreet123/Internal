

import { Course, User, UserProfile, Semester } from "../types";
import * as firebaseApp from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, setDoc, doc, getDoc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';

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

export const generateSyllabusHash = (text: string): string => {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 500); 
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
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
        
        // Check if user exists in DB to get their Tier and Profile
        let tier: 'FREE' | 'PRO' = 'FREE';
        let profile: UserProfile | undefined = undefined;

        if (db) {
            const userRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                tier = userData.tier || 'FREE';
                profile = userData.profile;
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
            tier: tier,
            profile: profile
        };
    } catch (error: any) {
        console.error("Sign In Error:", error);
        throw error;
    }
  },

  signUpWithEmail: async (email: string, pass: string, name: string): Promise<User> => {
      if (!auth) throw new Error("Firebase not initialized");
      try {
          const result = await createUserWithEmailAndPassword(auth, email, pass);
          const fbUser = result.user;
          
          await updateProfile(fbUser, { displayName: name });
          
          if (db) {
             const userRef = doc(db, "users", fbUser.uid);
             await setDoc(userRef, {
                email: fbUser.email,
                tier: 'FREE',
                profile: { role: 'Student', learningStyle: 'Visual' },
                createdAt: Date.now()
             });
          }
          
          return {
             id: fbUser.uid,
             name: name,
             email: fbUser.email || '',
             avatarUrl: '',
             tier: 'FREE',
             profile: { role: 'Student', learningStyle: 'Visual' } as any
          };
      } catch (error: any) {
          console.error("Sign Up Error", error);
          throw error;
      }
  },

  signInWithEmail: async (email: string, pass: string): Promise<User> => {
      if (!auth) throw new Error("Firebase not initialized");
      try {
          const result = await signInWithEmailAndPassword(auth, email, pass);
          const fbUser = result.user;
          
          let tier: 'FREE' | 'PRO' = 'FREE';
          let profile: UserProfile | undefined = undefined;

          if (db) {
             const userRef = doc(db, "users", fbUser.uid);
             const userSnap = await getDoc(userRef);
             if (userSnap.exists()) {
                 const d = userSnap.data();
                 tier = d.tier || 'FREE';
                 profile = d.profile;
             }
          }

          return {
              id: fbUser.uid,
              name: fbUser.displayName || 'User',
              email: fbUser.email || '',
              avatarUrl: fbUser.photoURL || '',
              tier: tier,
              profile: profile
          };
      } catch (error: any) {
          console.error("Sign In Error", error);
          throw error;
      }
  },

  updateUserProfile: async (userId: string, profile: UserProfile): Promise<void> => {
      if (!db) return;
      try {
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, { profile: profile });
      } catch (e) {
          console.error("Failed to update profile", e);
          throw e;
      }
  },

  signOut: async () => {
    if (auth) {
        await firebaseSignOut(auth);
    }
  },

  subscribeToAuthChanges: (callback: (user: User | null) => void): () => void => {
    if (!auth) {
        setTimeout(() => callback(null), 0);
        return () => {};
    }

    return onAuthStateChanged(auth, async (fbUser: any) => {
        if (!fbUser) {
            callback(null);
        } else {
             let tier: 'FREE' | 'PRO' = 'FREE';
             let profile: UserProfile | undefined = undefined;
             
             if (db) {
                 try {
                    const userRef = doc(db, "users", fbUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        tier = userSnap.data().tier || 'FREE';
                        profile = userSnap.data().profile;
                    }
                 } catch(e) {
                     console.error("Error fetching user data", e);
                 }
             }

             callback({
                id: fbUser.uid,
                name: fbUser.displayName || 'Anonymous',
                email: fbUser.email || '',
                avatarUrl: fbUser.photoURL || '',
                tier: tier,
                profile: profile
            });
        }
    });
  },

  upgradeUserToPro: async (userId: string): Promise<void> => {
      if (!db) return;
      try {
          await setDoc(doc(db, "users", userId), { tier: 'PRO' }, { merge: true });
      } catch (e) {
          console.error("Upgrade failed", e);
      }
  },

  saveUserCourse: async (userId: string, course: Course) => {
      if (!db) return;
      try {
          const courseToSave = JSON.parse(JSON.stringify(course));
          courseToSave.reels = courseToSave.reels.map((reel: any) => {
              const { videoUri, audioUri, imageUri, ...rest } = reel;
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

  // SOFT DELETE
  deleteUserCourse: async (userId: string, courseId: string) => {
      if (!db) return;
      try {
          const courseRef = doc(db, "users", userId, "courses", courseId);
          await updateDoc(courseRef, { deletedAt: Date.now() });
      } catch (e) {
          console.error("Failed to soft delete cloud course", e);
      }
  },

  // RESTORE
  restoreUserCourse: async (userId: string, courseId: string) => {
      if (!db) return;
      try {
          const courseRef = doc(db, "users", userId, "courses", courseId);
          await updateDoc(courseRef, { deletedAt: deleteField() });
      } catch (e) {
          console.error("Failed to restore cloud course", e);
      }
  },

  // PERMANENT DELETE
  permanentlyDeleteUserCourse: async (userId: string, courseId: string) => {
      if (!db) return;
      try {
          await deleteDoc(doc(db, "users", userId, "courses", courseId));
      } catch (e) {
          console.error("Failed to permanently delete cloud course", e);
      }
  },

  // --- SEMESTER CLOUD SYNC ---
  getUserSemesters: async (userId: string): Promise<Semester[]> => {
      if (!db) return [];
      try {
          const q = query(collection(db, "users", userId, "semesters"));
          const snapshot = await getDocs(q);
          const semesters: Semester[] = [];
          snapshot.forEach(doc => {
              semesters.push(doc.data() as Semester);
          });
          return semesters.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
          console.error("Failed to fetch cloud semesters:", e);
          return [];
      }
  },

  saveUserSemester: async (userId: string, semester: Semester) => {
      if (!db) return;
      try {
          const semesterRef = doc(db, "users", userId, "semesters", semester.id);
          await setDoc(semesterRef, semester);
      } catch (e) {
          console.error("Failed to sync semester to cloud:", e);
      }
  },

  deleteUserSemester: async (userId: string, semesterId: string) => {
      if (!db) return;
      try {
          await deleteDoc(doc(db, "users", userId, "semesters", semesterId));
      } catch (e) {
          console.error("Failed to delete cloud semester", e);
      }
  },
  // ---------------------------

  findPublicCourseMatch: async (syllabusHash: string): Promise<Course | null> => {
    return CloudService.getPublicCourseByHash(syllabusHash);
  },

  getPublicCourseByHash: async (syllabusHash: string): Promise<Course | null> => {
    if (!db) return null;
    try {
        const docRef = doc(db, "public_courses", syllabusHash);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
             return docSnap.data() as Course;
        }
        const q = query(collection(db, "public_courses"), where("syllabusHash", "==", syllabusHash));
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

  publishCourseToLibrary: async (course: Course) => {
    if (!db) return;
    try {
        if (course.syllabusHash) {
             const cleanCourse = JSON.parse(JSON.stringify(course));
             cleanCourse.reels = cleanCourse.reels.map((reel: any) => {
                 const { videoUri, audioUri, imageUri, ...rest } = reel;
                 return rest;
             });
             await setDoc(doc(db, "public_courses", course.syllabusHash), {
                 ...cleanCourse,
                 isPublic: true,
                 ownerId: 'public_library'
             });
        }
    } catch (e) {
        console.warn("Failed to publish course", e);
    }
  },

  sendCompletionEmail: async (email: string, courseTitle: string) => {
    console.log(`[CLOUD FUNCTION TRIGGER] Send email to ${email}: Your course "${courseTitle}" is ready.`);
  }
};
