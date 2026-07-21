import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          try {
            const idToken = await currentUser.getIdToken();
            setToken(idToken);
          } catch (error) {
            console.error("Error getting ID token", error);
            setToken(null);
          }
        } else {
          setToken(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.error(e);
      setConfigError(e.message);
      setLoading(false);
    }
  }, []);

  // Set up token refresh interval (ID tokens expire in 1 hour)
  useEffect(() => {
    if (!user) return;
    
    const intervalId = setInterval(async () => {
      try {
        const idToken = await user.getIdToken(true); // force refresh
        setToken(idToken);
      } catch (error) {
        console.error("Error refreshing ID token", error);
      }
    }, 1000 * 60 * 10); // Refresh every 10 minutes

    return () => clearInterval(intervalId);
  }, [user]);

  const signOut = async () => {
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full p-6 bg-red-50 text-red-600 rounded-xl shadow-lg border border-red-200">
          <h2 className="text-lg font-bold mb-2">Configuration Missing</h2>
          <p>{configError}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, token, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
