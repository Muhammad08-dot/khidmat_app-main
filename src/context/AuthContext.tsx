import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import { profileColumnsFromCamel } from '../services/supabase/legacy';
import { registerPushToken } from '../services/push';
import { User as UserProfileModel } from '../types/models'; // Note: update models.ts to match Supabase schema later

// Client-side throttle: max 5 auth attempts per 60s to blunt signup/OTP spam.
const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_ATTEMPTS = 5;

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
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const authAttempts = useRef<number[]>([]);

  const throttleAuth = () => {
    const now = Date.now();
    authAttempts.current = authAttempts.current.filter((t) => now - t < AUTH_WINDOW_MS);
    if (authAttempts.current.length >= AUTH_MAX_ATTEMPTS) {
      throw new Error('Too many attempts. Please wait a minute and try again.');
    }
    authAttempts.current.push(now);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (profile) {
        // Merge the optional provider row so screens see one flat profile object.
        const { data: providerRow } = await supabase
          .from('providers')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        setUserProfile({
          ...profile,
          photoURL: profile.photo_url,
          ...(providerRow
            ? {
                category: providerRow.category,
                bio: providerRow.bio,
                basePrice: providerRow.base_price,
                rating: providerRow.rating,
                totalJobs: providerRow.total_jobs,
                tier: providerRow.tier,
                available: providerRow.available,
                totalEarnings: providerRow.total_earnings,
              }
            : {}),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

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
        void registerPushToken(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    throttleAuth();
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
    throttleAuth();
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

  const sendPasswordReset = async (email: string) => {
    throttleAuth();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'khidmat://reset-password',
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const PHONE_AUTH_ENABLED = process.env.EXPO_PUBLIC_PHONE_AUTH_ENABLED === 'true';

  const sendPhoneOtp = async (phone: string) => {
    if (!PHONE_AUTH_ENABLED) {
      throw new Error('Phone sign-in is not enabled yet. Please use email.');
    }
    throttleAuth();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    throttleAuth();
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    return data;
  };

  const PROVIDER_FIELD_MAP: Record<string, string> = {
    category: 'category',
    bio: 'bio',
    basePrice: 'base_price',
    rating: 'rating',
    totalJobs: 'total_jobs',
    tier: 'tier',
    available: 'available',
    totalEarnings: 'total_earnings',
  };

  const updateProfile = async (newData: any) => {
    if (!user) return;

    // Split the flat camelCase patch across the `profiles` and `providers` tables.
    const profileKeys = Object.keys(newData).filter(
      (k) => !(k in PROVIDER_FIELD_MAP) && k !== 'jobsHistory'
    );
    const profilePatch = profileColumnsFromCamel(
      profileKeys.reduce((acc: any, k) => ({ ...acc, [k]: newData[k] }), {})
    );
    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabase.from('profiles').update(profilePatch).eq('id', user.id);
      if (error) throw error;
    }

    const providerPatch: Record<string, any> = {};
    Object.keys(newData).forEach((k) => {
      if (k in PROVIDER_FIELD_MAP) providerPatch[PROVIDER_FIELD_MAP[k]] = newData[k];
    });
    if (Object.keys(providerPatch).length > 0) {
      const { error } = await supabase
        .from('providers')
        .upsert({ id: user.id, ...providerPatch }, { onConflict: 'id' });
      if (error) throw error;
    }

    setUserProfile((prev: any) => ({ ...prev, ...newData }));
  };

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, signIn, signUp, logout, updateProfile, sendPasswordReset, updatePassword, sendPhoneOtp, verifyPhoneOtp }}>
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
