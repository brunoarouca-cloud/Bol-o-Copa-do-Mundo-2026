"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
  getIdToken,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserDoc } from "@/types";

interface AuthState {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    userDoc: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, userDoc: null, loading: false, isAdmin: false });
        return;
      }

      // Verifica custom claim de admin
      const tokenResult = await user.getIdTokenResult();
      const isAdmin = tokenResult.claims.admin === true;

      // Carrega documento do usuário
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userDoc = userSnap.exists() ? (userSnap.data() as UserDoc) : null;

      setState({ user, userDoc, loading: false, isAdmin });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Força refresh do token para carregar custom claims
    await getIdToken(cred.user, true);
    return cred;
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      phone: string
    ) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = cred;

      // Atualiza displayName no perfil Firebase Auth
      await updateProfile(user, { displayName });

      // Cria documento do usuário no Firestore
      const userDoc: UserDoc = {
        uid: user.uid,
        email: user.email!,
        displayName,
        phone,
        createdAt: Timestamp.now(),
        totalPoints: 0,
        exactHits: 0,
        rank: 0,
        isAdmin: false,
      };

      await setDoc(doc(db, "users", user.uid), userDoc);

      return cred;
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    resetPassword,
  };
}
