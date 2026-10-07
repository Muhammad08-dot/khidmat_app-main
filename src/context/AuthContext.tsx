import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import { User as UserProfileModel } from '../types/models'; // Note: update models.ts to match Supabase schema later

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: any | null; // We'll type this properly in Phase 2 with database.types.ts
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone: string,
    city: string,
    role: 'customer' | 'provider',
    location: { lat: number; lng: number },
    providerDetails?: { category: string; bio: string; basePrice: number }
  ) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (newData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // In Phase 2 we will fetch from `profiles` table. Mocking for Phase 1.
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    city: string,
    role: 'customer' | 'provider',
    location: { lat: number; lng: number },
    providerDetails?: { category: string; bio: string; basePrice: number }
  ) => {
    // In Supabase, the profile creation is handled by Postgres triggers (Phase 2),
    // but we can pass user metadata during signup.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          city,
          role,
          location_lat: location.lat,
          location_lng: location.lng,
          ...(providerDetails || {})
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (newData: any) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(newData).eq('id', user.id);
    if (error) throw error;
    setUserProfile((prev: any) => ({ ...prev, ...newData }));
  };

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, signIn, signUp, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
