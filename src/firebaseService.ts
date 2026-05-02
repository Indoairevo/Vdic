import { db, auth } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, addDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getUsers = async () => {
  if (!auth.currentUser) return null;
  const path = 'users';
  try {
    const usersCol = collection(db, path);
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getUser = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    const userDoc = doc(db, 'users', userId);
    const snapshot = await getDoc(userDoc);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

const removeUndefined = (obj: any) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
};

export const addUser = async (user: any) => {
  const path = `users/${user.id}`;
  try {
    const userDoc = doc(db, 'users', user.id);
    await setDoc(userDoc, removeUndefined(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateUser = async (userId: string, user: any) => {
  const path = `users/${userId}`;
  try {
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, removeUndefined(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteUser = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getAttendance = async (userId: string) => {
  if (!auth.currentUser) return null;
  const path = 'attendance';
  try {
    const attendanceCol = collection(db, path);
    const q = query(attendanceCol, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addAttendance = async (attendance: any) => {
  const path = 'attendance';
  try {
    await addDoc(collection(db, path), removeUndefined(attendance));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Generic CRUD
export const getAll = async (collectionName: string) => {
  try {
    const col = collection(db, collectionName);
    const snapshot = await getDocs(col);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
};

export const addOne = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), removeUndefined(data));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
};

export const updateOne = async (collectionName: string, id: string, data: any) => {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, removeUndefined(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteOne = async (collectionName: string, id: string) => {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
