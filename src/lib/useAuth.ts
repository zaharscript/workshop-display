import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  validateOperatorDocument,
  type OperatorRecord,
  type OperatorRole,
} from './operatorAccess';

export { validateOperatorDocument } from './operatorAccess';
export type { OperatorRecord, OperatorRole } from './operatorAccess';

export interface UseAuthReturn {
  user: User | null;
  /** True for both admin and mechanic roles with active===true operator documents. */
  isOperator: boolean;
  /** True only when operatorProfile.role === 'admin'. */
  isAdmin: boolean;
  operatorProfile: OperatorRecord | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isOperator, setIsOperator] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [operatorProfile, setOperatorProfile] = useState<OperatorRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const verifyOperatorStatus = useCallback(async (firebaseUser: User | null): Promise<boolean> => {
    if (!firebaseUser) {
      setUser(null);
      setIsOperator(false);
      setIsAdmin(false);
      setOperatorProfile(null);
      return false;
    }

    try {
      const opDocRef = doc(db, 'operators', firebaseUser.uid);
      const opDoc = await getDoc(opDocRef);

      if (opDoc.exists()) {
        const data = opDoc.data() as Record<string, unknown>;
        const profile = validateOperatorDocument(
          firebaseUser.uid,
          firebaseUser.email || (data.email as string) || '',
          data
        );
        if (profile) {
          // Override email with Firebase Auth's authoritative value when available.
          const resolvedProfile: OperatorRecord = {
            ...profile,
            email: firebaseUser.email || profile.email,
            name: profile.name || firebaseUser.displayName || 'Operator',
          };
          setUser(firebaseUser);
          setIsOperator(true);
          setIsAdmin(resolvedProfile.role === 'admin');
          setOperatorProfile(resolvedProfile);
          return true;
        }
      }

      // Authenticated but not an active authorized operator
      setUser(null);
      setIsOperator(false);
      setIsAdmin(false);
      setOperatorProfile(null);
      setError('Akaun ini tidak mempunyai kebenaran operator bengkel atau telah dinyahaktifkan.');
      await signOut(auth);
      return false;
    } catch (err: unknown) {
      console.error('Failed to verify operator role:', err);
      setUser(null);
      setIsOperator(false);
      setIsAdmin(false);
      setOperatorProfile(null);
      setError('Ralat semasa mengesahkan kebenaran operator.');
      try {
        await signOut(auth);
      } catch (signOutError: unknown) {
        console.error('Failed to sign out an unverified Firebase user:', signOutError);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      await verifyOperatorStatus(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [verifyOperatorStatus]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const isValid = await verifyOperatorStatus(credential.user);
      return isValid;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      let friendlyMessage = 'Gagal log masuk. Sila semak emel dan kata laluan anda.';

      switch (firebaseError.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          friendlyMessage = 'Emel atau kata laluan tidak sah. Sila cuba lagi.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'Format alamat emel tidak sah.';
          break;
        case 'auth/user-disabled':
          friendlyMessage = 'Akaun pengguna ini telah dinyahaktifkan.';
          break;
        case 'auth/too-many-requests':
          friendlyMessage = 'Terlalu banyak percubaan gagal. Sila cuba sebentar lagi.';
          break;
        default:
          if (firebaseError.message) {
            friendlyMessage = `Ralat log masuk: ${firebaseError.message}`;
          }
          break;
      }

      setError(friendlyMessage);
      setUser(null);
      setIsOperator(false);
      setIsAdmin(false);
      setOperatorProfile(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setIsOperator(false);
      setIsAdmin(false);
      setOperatorProfile(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  return {
    user,
    isOperator,
    isAdmin,
    operatorProfile,
    loading,
    error,
    login,
    logout,
    clearError,
  };
}
