import { Course, ReelData } from "../types";

const DB_NAME = 'OrbisDB';
const DB_VERSION = 1;
const STORE_NAME = 'courses';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject("DB Error");
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };
  });
};

export const saveCourse = async (course: Course): Promise<void> => {
  try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(course);
      return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  } catch (e) {
      console.error("Failed to save course", e);
  }
};

export const getAllCourses = async (): Promise<Course[]> => {
  try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
          request.onsuccess = () => {
             // Sort by last accessed desc
             const courses = request.result as Course[];
             resolve(courses.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt));
          };
          request.onerror = () => reject(request.error);
      });
  } catch (e) {
      return [];
  }
};

export const getCourseById = async (id: string): Promise<Course | undefined> => {
     try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
       return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
     } catch (e) { return undefined; }
}

export const deleteCourse = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    } catch (e) { console.error(e); }
}