import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  authSubscribe, 
  signInUser, 
  signUpUser, 
  signOutUser, 
  writeUserProfile, 
  getUserProfile,
  writeDocument,
  uploadProfilePhoto
} from '../services/firebase';

interface WorkerProfile {
  category: string;
  bio: string;
  basePrice: number;
  rating: number | null;
  totalJobs: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  available: boolean;
  totalEarnings: number;
  jobsHistory: string[];
}

interface ClientProfile {
  bookingsHistory: string[];
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  city: string;
  role: 'customer' | 'provider';
  current_mode: 'worker' | 'client';
  location: { lat: number; lng: number };
  createdAt: string;
  category?: string;
  bio?: string;
  basePrice?: number;
  rating?: number | null;
  totalJobs?: number;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  available?: boolean;
  photoURL?: string;
  totalEarnings?: number;
  jobsHistory?: string[];
  worker_profile?: WorkerProfile;
  client_profile?: ClientProfile;
}

interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
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
    providerDetails?: { category: string; bio: string; basePrice: number },
    photoFile?: File
  ) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (newData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = authSubscribe(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile as UserProfile);
        } catch (err) {
          console.error("Error fetching user profile from Firestore:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInUser(email, password);
      return result;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    phone: string, 
    city: string,
    role: 'customer' | 'provider',
    location: { lat: number; lng: number },
    providerDetails?: { category: string; bio: string; basePrice: number },
    photoFile?: File
  ) => {
    setLoading(true);
    try {
      // 1. Create auth credentials
      const result = await signUpUser(email, password);
      
      // Upload photo if present
      let photoURL = '';
      if (photoFile) {
        try {
          photoURL = await uploadProfilePhoto(result.user.uid, photoFile);
        } catch (uploadErr) {
          console.error("Photo upload failed:", uploadErr);
        }
      }
      
      // 2. Write profile data to users collection
      const profileData: any = { 
        name, 
        email, 
        phone, 
        city,
        role,
        current_mode: role === 'provider' ? 'worker' : 'client',
        location,
        photoURL,
        createdAt: new Date().toISOString()
      };

      if (role === 'provider' && providerDetails) {
        const worker_profile = {
          category: providerDetails.category,
          bio: providerDetails.bio,
          basePrice: Number(providerDetails.basePrice),
          rating: null, // Default rating is null
          totalJobs: 0,
          tier: 'Bronze' as const,
          available: true,
          totalEarnings: 0,
          jobsHistory: []
        };
        
        profileData.worker_profile = worker_profile;
        profileData.client_profile = { bookingsHistory: [] };

        // Support root fields compatibility
        profileData.category = providerDetails.category;
        profileData.bio = providerDetails.bio;
        profileData.basePrice = Number(providerDetails.basePrice);
        profileData.rating = null;
        profileData.totalJobs = 0;
        profileData.tier = 'Bronze';
        profileData.available = true;
        profileData.totalEarnings = 0;
        profileData.jobsHistory = [];

        // Also write to providers collection for easier querying
        await writeDocument('providers', result.user.uid, {
          userId: result.user.uid,
          name,
          email,
          phone,
          city,
          location,
          category: providerDetails.category,
          bio: providerDetails.bio,
          basePrice: Number(providerDetails.basePrice),
          rating: null, // Rating is null on init
          totalJobs: 0,
          tier: 'Bronze',
          available: true,
          photoURL,
          totalEarnings: 0
        });
      } else {
        profileData.client_profile = { bookingsHistory: [] };
      }
      
      await writeUserProfile(result.user.uid, profileData);
      return result;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (newData: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      ...newData
    };

    // Keep sub-object worker_profile in sync if role is provider
    if (updatedProfile.role === 'provider' || updatedProfile.worker_profile) {
      const currentWorkerProfile = updatedProfile.worker_profile || {
        category: updatedProfile.category || '',
        bio: updatedProfile.bio || '',
        basePrice: updatedProfile.basePrice || 0,
        rating: updatedProfile.rating !== undefined ? updatedProfile.rating : null,
        totalJobs: updatedProfile.totalJobs || 0,
        tier: updatedProfile.tier || 'Bronze',
        available: updatedProfile.available !== false,
        totalEarnings: updatedProfile.totalEarnings || 0,
        jobsHistory: updatedProfile.jobsHistory || []
      };

      updatedProfile.worker_profile = {
        ...currentWorkerProfile,
        category: newData.category !== undefined ? newData.category : currentWorkerProfile.category,
        bio: newData.bio !== undefined ? newData.bio : currentWorkerProfile.bio,
        basePrice: newData.basePrice !== undefined ? Number(newData.basePrice) : currentWorkerProfile.basePrice,
        rating: newData.rating !== undefined ? newData.rating : currentWorkerProfile.rating,
        totalJobs: newData.totalJobs !== undefined ? newData.totalJobs : currentWorkerProfile.totalJobs,
        tier: newData.tier !== undefined ? (newData.tier as any) : currentWorkerProfile.tier,
        available: newData.available !== undefined ? newData.available : currentWorkerProfile.available,
        totalEarnings: newData.totalEarnings !== undefined ? newData.totalEarnings : currentWorkerProfile.totalEarnings,
        jobsHistory: newData.jobsHistory !== undefined ? newData.jobsHistory : currentWorkerProfile.jobsHistory
      };

      // Keep root properties in sync for backward compatibility
      updatedProfile.category = updatedProfile.worker_profile.category;
      updatedProfile.bio = updatedProfile.worker_profile.bio;
      updatedProfile.basePrice = updatedProfile.worker_profile.basePrice;
      updatedProfile.rating = updatedProfile.worker_profile.rating;
      updatedProfile.totalJobs = updatedProfile.worker_profile.totalJobs;
      updatedProfile.tier = updatedProfile.worker_profile.tier;
      updatedProfile.available = updatedProfile.worker_profile.available;
      updatedProfile.totalEarnings = updatedProfile.worker_profile.totalEarnings;
      updatedProfile.jobsHistory = updatedProfile.worker_profile.jobsHistory;
    }

    await writeUserProfile(user.uid, updatedProfile);

    if (updatedProfile.role === 'provider' && updatedProfile.worker_profile) {
      await writeDocument('providers', user.uid, {
        userId: user.uid,
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        city: updatedProfile.city,
        location: updatedProfile.location,
        category: updatedProfile.worker_profile.category,
        bio: updatedProfile.worker_profile.bio,
        basePrice: updatedProfile.worker_profile.basePrice,
        rating: updatedProfile.worker_profile.rating,
        totalJobs: updatedProfile.worker_profile.totalJobs,
        tier: updatedProfile.worker_profile.tier,
        available: updatedProfile.worker_profile.available,
        photoURL: updatedProfile.photoURL || '',
        totalEarnings: updatedProfile.worker_profile.totalEarnings
      });
    }

    setUserProfile(updatedProfile);
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
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
