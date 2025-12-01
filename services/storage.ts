

import { Course, ReelData, Semester, TimeTableDay, Assignment, DailyLog } from "../types";

const DB_NAME = 'OrbisDB';
const DB_VERSION = 3; // Bumped version for new stores
const COURSE_STORE = 'courses';
const SEMESTER_STORE = 'semesters';
const TIMETABLE_STORE = 'timetable';
const ASSIGNMENT_STORE = 'assignments';
const DAILYLOG_STORE = 'dailylogs';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject("DB Error");
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(COURSE_STORE)) {
        db.createObjectStore(COURSE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SEMESTER_STORE)) {
        db.createObjectStore(SEMESTER_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TIMETABLE_STORE)) {
        db.createObjectStore(TIMETABLE_STORE, { keyPath: 'day' });
      }
      if (!db.objectStoreNames.contains(ASSIGNMENT_STORE)) {
        db.createObjectStore(ASSIGNMENT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DAILYLOG_STORE)) {
        db.createObjectStore(DAILYLOG_STORE, { keyPath: 'date' });
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
      const tx = db.transaction(COURSE_STORE, 'readwrite');
      const store = tx.objectStore(COURSE_STORE);
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
      const tx = db.transaction(COURSE_STORE, 'readonly');
      const store = tx.objectStore(COURSE_STORE);
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
      const tx = db.transaction(COURSE_STORE, 'readonly');
      const store = tx.objectStore(COURSE_STORE);
      const request = store.get(id);
       return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
     } catch (e) { return undefined; }
}

// Soft Delete (Move to Trash)
export const deleteCourse = async (id: string): Promise<void> => {
    try {
        const course = await getCourseById(id);
        if (course) {
            course.deletedAt = Date.now();
            await saveCourse(course);
        }
    } catch (e) { console.error(e); }
}

// Restore from Trash
export const restoreCourse = async (id: string): Promise<void> => {
    try {
        const course = await getCourseById(id);
        if (course) {
            delete course.deletedAt;
            await saveCourse(course);
        }
    } catch (e) { console.error(e); }
}

// Permanent Delete
export const permanentlyDeleteCourse = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(COURSE_STORE, 'readwrite');
        const store = tx.objectStore(COURSE_STORE);
        store.delete(id);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    } catch (e) { console.error(e); }
}

// --- SEMESTER FUNCTIONS ---

export const saveSemester = async (semester: Semester): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(SEMESTER_STORE, 'readwrite');
        const store = tx.objectStore(SEMESTER_STORE);
        store.put(semester);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save semester", e);
    }
};

export const getAllSemesters = async (): Promise<Semester[]> => {
    try {
        const db = await openDB();
        const tx = db.transaction(SEMESTER_STORE, 'readonly');
        const store = tx.objectStore(SEMESTER_STORE);
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const semesters = request.result as Semester[];
                resolve(semesters.sort((a, b) => b.createdAt - a.createdAt));
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return [];
    }
};

export const deleteSemester = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(SEMESTER_STORE, 'readwrite');
        const store = tx.objectStore(SEMESTER_STORE);
        store.delete(id);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    } catch (e) { console.error(e); }
};

// --- TIMETABLE FUNCTIONS ---

export const saveTimetableDay = async (daySchedule: TimeTableDay): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(TIMETABLE_STORE, 'readwrite');
        const store = tx.objectStore(TIMETABLE_STORE);
        store.put(daySchedule);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    } catch (e) { console.error(e); }
};

export const getTimetable = async (): Promise<TimeTableDay[]> => {
    try {
        const db = await openDB();
        const tx = db.transaction(TIMETABLE_STORE, 'readonly');
        const store = tx.objectStore(TIMETABLE_STORE);
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || []);
        });
    } catch (e) { return []; }
};

// --- ASSIGNMENT FUNCTIONS ---

export const saveAssignment = async (assignment: Assignment): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(ASSIGNMENT_STORE, 'readwrite');
        const store = tx.objectStore(ASSIGNMENT_STORE);
        store.put(assignment);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    } catch (e) { console.error(e); }
};

export const getAllAssignments = async (): Promise<Assignment[]> => {
    try {
        const db = await openDB();
        const tx = db.transaction(ASSIGNMENT_STORE, 'readonly');
        const store = tx.objectStore(ASSIGNMENT_STORE);
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || []);
        });
    } catch (e) { return []; }
};

export const deleteAssignment = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(ASSIGNMENT_STORE, 'readwrite');
        const store = tx.objectStore(ASSIGNMENT_STORE);
        store.delete(id);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    } catch (e) { console.error(e); }
};

// --- DAILY LOG FUNCTIONS ---

export const saveDailyLog = async (log: DailyLog): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(DAILYLOG_STORE, 'readwrite');
        const store = tx.objectStore(DAILYLOG_STORE);
        store.put(log);
        return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
    } catch (e) { console.error(e); }
};

export const getDailyLog = async (date: string): Promise<DailyLog | undefined> => {
    try {
        const db = await openDB();
        const tx = db.transaction(DAILYLOG_STORE, 'readonly');
        const store = tx.objectStore(DAILYLOG_STORE);
        const request = store.get(date);
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) { return undefined; }
};