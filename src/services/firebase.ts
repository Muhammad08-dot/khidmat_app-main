import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const hasCredentials = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your_api_key_here';

let firebaseApp;
let auth: any;
let db: any;

// Helper mock types and class for fallback local testing
class MockAuth {
  private listeners: Array<(user: any) => void> = [];
  private currentUser: any = null;

  constructor() {
    const savedUser = localStorage.getItem('mock_user_session');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    setTimeout(() => callback(this.currentUser), 50);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithEmailAndPassword(email: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const registeredUsers = JSON.parse(localStorage.getItem('mock_registered_users') || '[]');
    const user = registeredUsers.find((u: any) => u.email === email);
    
    if (!user) {
      throw new Error('auth/user-not-found');
    }
    
    this.currentUser = { uid: user.uid, email: user.email, emailVerified: true };
    localStorage.setItem('mock_user_session', JSON.stringify(this.currentUser));
    this.triggerListeners();
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const registeredUsers = JSON.parse(localStorage.getItem('mock_registered_users') || '[]');
    
    if (registeredUsers.some((u: any) => u.email === email)) {
      throw new Error('auth/email-already-in-use');
    }

    const uid = 'mock_uid_' + Math.random().toString(36).substring(2, 11);
    
    this.currentUser = { uid, email, emailVerified: true };
    localStorage.setItem('mock_user_session', JSON.stringify(this.currentUser));
    this.triggerListeners();
    return { user: this.currentUser };
  }

  async signOut() {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.currentUser = null;
    localStorage.removeItem('mock_user_session');
    this.triggerListeners();
  }

  private triggerListeners() {
    this.listeners.forEach(l => l(this.currentUser));
  }
}

class MockFirestore {
  async setDoc(docRef: any, data: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const collection = docRef.collection;
    const docId = docRef.id;
    const storeKey = `mock_db_${collection}`;
    
    const items = JSON.parse(localStorage.getItem(storeKey) || '{}');
    items[docId] = { ...data, id: docId, updatedAt: new Date().toISOString() };
    localStorage.setItem(storeKey, JSON.stringify(items));
    
    if (collection === 'users') {
      const registeredUsers = JSON.parse(localStorage.getItem('mock_registered_users') || '[]');
      if (!registeredUsers.some((u: any) => u.email === data.email)) {
        registeredUsers.push({ uid: docId, email: data.email });
        localStorage.setItem('mock_registered_users', JSON.stringify(registeredUsers));
      }
    }
  }

  async getDoc(docRef: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const collection = docRef.collection;
    const docId = docRef.id;
    const items = JSON.parse(localStorage.getItem(`mock_db_${collection}`) || '{}');
    const data = items[docId];
    return {
      exists: () => !!data,
      data: () => data
    };
  }
}

export const isMockFirebase = !hasCredentials;

let storage: any;

if (hasCredentials) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} else {
  auth = new MockAuth();
  db = new MockFirestore();
  storage = null;
  console.warn("Firebase credentials missing. Using Mock Firebase state (stored in localStorage) for local testing.");
}

// Wrapper APIs for Auth & Firestore Operations
export const authSubscribe = (callback: (user: any) => void) => {
  if (isMockFirebase) {
    return auth.onAuthStateChanged(callback);
  } else {
    return onAuthStateChanged(auth, callback);
  }
};

export const signInUser = async (email: string, password: string) => {
  if (isMockFirebase) {
    return auth.signInWithEmailAndPassword(email, password);
  } else {
    return signInWithEmailAndPassword(auth, email, password);
  }
};

export const signUpUser = async (email: string, password: string) => {
  if (isMockFirebase) {
    return auth.createUserWithEmailAndPassword(email, password);
  } else {
    return createUserWithEmailAndPassword(auth, email, password);
  }
};

export const signOutUser = async () => {
  if (isMockFirebase) {
    return auth.signOut();
  } else {
    return signOut(auth);
  }
};

export const writeUserProfile = async (userId: string, data: any) => {
  const payload = {
    ...data,
    createdAt: new Date().toISOString()
  };

  if (isMockFirebase) {
    const docRef = { collection: 'users', id: userId };
    return db.setDoc(docRef, payload);
  } else {
    const docRef = doc(db, 'users', userId);
    return setDoc(docRef, payload);
  }
};

export const getUserProfile = async (userId: string) => {
  if (isMockFirebase) {
    const docRef = { collection: 'users', id: userId };
    const snapshot = await db.getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } else {
    const docRef = doc(db, 'users', userId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  }
};

export const writeDocument = async (collectionName: string, docId: string, data: any) => {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (isMockFirebase) {
    const docRef = { collection: collectionName, id: docId };
    const res = await db.setDoc(docRef, payload);
    if (collectionName === 'bookings') {
      window.dispatchEvent(new CustomEvent('mock_booking_update'));
    }
    return res;
  } else {
    const docRef = doc(db, collectionName, docId);
    return setDoc(docRef, payload);
  }
};

export const getDocument = async (collectionName: string, docId: string) => {
  if (isMockFirebase) {
    const docRef = { collection: collectionName, id: docId };
    const snapshot = await db.getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } else {
    const docRef = doc(db, collectionName, docId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  }
};

export const getCollectionDocs = async (collectionName: string) => {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const items = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
    return Object.values(items);
  } else {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

export const queryCollectionDocs = async (
  collectionName: string, 
  field: string, 
  operator: '==' | '<' | '>' | '<=' | '>=', 
  value: any
) => {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const items = JSON.parse(localStorage.getItem(`mock_db_${collectionName}`) || '{}');
    const list = Object.values(items) as any[];
    return list.filter(item => {
      if (operator === '==') return item[field] === value;
      if (operator === '<') return item[field] < value;
      if (operator === '>') return item[field] > value;
      if (operator === '<=') return item[field] <= value;
      if (operator === '>=') return item[field] >= value;
      return false;
    });
  } else {
    const colRef = collection(db, collectionName);
    const q = query(colRef, where(field, operator, value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

export const sendChatMessage = async (bookingId: string, senderId: string, senderName: string, text: string) => {
  const messagePayload = {
    senderId,
    senderName,
    text,
    createdAt: new Date().toISOString()
  };

  if (isMockFirebase) {
    const storeKey = `mock_db_messages_${bookingId}`;
    const currentMessages = JSON.parse(localStorage.getItem(storeKey) || '[]');
    const newMessage = {
      id: 'mock_msg_' + Math.random().toString(36).substring(2, 11),
      ...messagePayload
    };
    currentMessages.push(newMessage);
    localStorage.setItem(storeKey, JSON.stringify(currentMessages));
    
    // Dispatch local custom event for instant same-tab updates
    window.dispatchEvent(new CustomEvent('mock_message_update', { detail: { bookingId } }));
    return newMessage;
  } else {
    const msgColRef = collection(db, 'bookings', bookingId, 'messages');
    const docRef = await addDoc(msgColRef, messagePayload);
    return { id: docRef.id, ...messagePayload };
  }
};

export const listenToChatMessages = (
  bookingId: string, 
  callback: (messages: any[]) => void
) => {
  if (isMockFirebase) {
    const storeKey = `mock_db_messages_${bookingId}`;
    
    // Initial fetch
    const getLocalMessages = () => {
      return JSON.parse(localStorage.getItem(storeKey) || '[]');
    };
    
    callback(getLocalMessages());

    // Event listener for same-tab updates
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.bookingId === bookingId) {
        callback(getLocalMessages());
      }
    };
    
    // Storage listener for cross-tab updates
    const handleCrossTabUpdate = (e: StorageEvent) => {
      if (e.key === storeKey) {
        callback(getLocalMessages());
      }
    };

    // Polling backup
    let lastLength = getLocalMessages().length;
    const intervalId = setInterval(() => {
      const current = getLocalMessages();
      if (current.length !== lastLength) {
        lastLength = current.length;
        callback(current);
      }
    }, 800);

    window.addEventListener('mock_message_update', handleLocalUpdate);
    window.addEventListener('storage', handleCrossTabUpdate);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mock_message_update', handleLocalUpdate);
      window.removeEventListener('storage', handleCrossTabUpdate);
    };
  } else {
    const msgColRef = collection(db, 'bookings', bookingId, 'messages');
    const q = query(msgColRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    }, (error) => {
      console.error("[Firestore] Chat listener error:", error);
    });

    return unsubscribe;
  }
};

export const submitProviderReview = async (bookingId: string, providerId: string, rating: number) => {
  // 1. Get the booking details
  const bookingData = await getDocument('bookings', bookingId) as any;
  if (!bookingData) throw new Error("Booking not found for rating.");

  // 2. Save customer rating on the booking and close it
  bookingData.customerRating = rating;
  bookingData.status = 'closed';
  bookingData.reviewedAt = new Date().toISOString();
  await writeDocument('bookings', bookingId, bookingData);

  // 3. Get all completed/closed bookings for this provider to calculate new averages
  const allBookings = await queryCollectionDocs('bookings', 'providerId', '==', providerId);
  const updatedBookings = allBookings.map((b: any) => 
    b.bookingId === bookingId ? { ...b, customerRating: rating, status: 'closed' } : b
  );
  const completedOrClosedBookings = updatedBookings.filter((b: any) => b.status === 'completed' || b.status === 'closed');
  const reviewedBookings = completedOrClosedBookings.filter((b: any) => b.customerRating !== undefined && b.customerRating !== null);

  const totalJobsCount = completedOrClosedBookings.length;
  
  // Recalculate average based purely on submitted reviews
  let finalRating: number | null = null;
  if (reviewedBookings.length > 0) {
    const sumRatings = reviewedBookings.reduce((sum: number, b: any) => sum + (b.customerRating || 0), 0);
    finalRating = sumRatings / reviewedBookings.length;
    finalRating = Math.round(finalRating * 10) / 10;
    if (finalRating > 5.0) finalRating = 5.0;
    if (finalRating < 1.0) finalRating = 1.0;
  }

  // Determine dynamic level tiers (Bronze, Silver, Gold, Platinum)
  let updatedTier = 'Bronze';
  if (finalRating !== null) {
    if (finalRating >= 4.7 && totalJobsCount >= 8) {
      updatedTier = 'Platinum';
    } else if (finalRating >= 4.5 && totalJobsCount >= 4) {
      updatedTier = 'Gold';
    } else if (finalRating >= 4.2 && totalJobsCount >= 2) {
      updatedTier = 'Silver';
    }
  }

  // 4. Load baseline statistics of the provider profile to update totalJobs, tier, etc.
  const providerProfile = await getDocument('providers', providerId) as any;
  
  // 5. Update earnings and jobs history
  const userProfile = await getDocument('users', providerId) as any;
  const currentEarnings = Number(userProfile?.totalEarnings || providerProfile?.totalEarnings || 0);
  const updatedEarnings = currentEarnings + Number(bookingData.totalPrice || bookingData.basePrice || 0);
  
  const currentHistory = userProfile?.jobsHistory || providerProfile?.jobsHistory || [];
  const updatedHistory = [...currentHistory];
  if (!updatedHistory.includes(bookingId)) {
    updatedHistory.push(bookingId);
  }

  // 6. Update providers and users collection documents
  if (providerProfile) {
    await writeDocument('providers', providerId, {
      ...providerProfile,
      rating: finalRating,
      totalJobs: totalJobsCount,
      tier: updatedTier,
      totalEarnings: updatedEarnings
    });
  }

  if (userProfile) {
    await writeDocument('users', providerId, {
      ...userProfile,
      rating: finalRating,
      totalJobs: totalJobsCount,
      tier: updatedTier,
      totalEarnings: updatedEarnings,
      jobsHistory: updatedHistory,
      // Sync worker_profile sub-object if present
      worker_profile: userProfile.worker_profile ? {
        ...userProfile.worker_profile,
        rating: finalRating,
        totalJobs: totalJobsCount,
        tier: updatedTier,
        totalEarnings: updatedEarnings,
        jobsHistory: updatedHistory
      } : undefined
    });
  }

  console.log(`[Review] Submitted successfully. New Provider Rating: ${finalRating}, Tier: ${updatedTier}`);
  return { finalRating, updatedTier };
};

// Real-time Push Notification APIs
export const createNotification = async (
  userId: string,
  type: 'new_request' | 'job_accepted' | 'job_completed' | 'job_confirmed' | 'chat_message' | 'payment_received',
  message: string,
  relatedJobId: string
) => {
  const payload = {
    userId,
    type,
    message,
    read: false,
    relatedJobId,
    createdAt: new Date().toISOString()
  };

  if (isMockFirebase) {
    const storeKey = `mock_db_notifications_${userId}`;
    const notifications = JSON.parse(localStorage.getItem(storeKey) || '[]');
    const newNotif = {
      id: 'mock_notif_' + Math.random().toString(36).substring(2, 11),
      ...payload
    };
    notifications.push(newNotif);
    localStorage.setItem(storeKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('mock_notification_update', { detail: { userId } }));
    return newNotif;
  } else {
    const colRef = collection(db, 'notifications');
    const docRef = await addDoc(colRef, payload);
    return { id: docRef.id, ...payload };
  }
};

export const listenToNotifications = (
  userId: string,
  callback: (notifications: any[]) => void
) => {
  if (isMockFirebase) {
    const storeKey = `mock_db_notifications_${userId}`;
    const getLocalNotifications = () => {
      const all = JSON.parse(localStorage.getItem(storeKey) || '[]');
      return all.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    };
    
    callback(getLocalNotifications());

    // Event listener for same-tab updates
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.userId === userId) {
        callback(getLocalNotifications());
      }
    };
    
    // Cross-tab sync
    const handleCrossTabUpdate = (e: StorageEvent) => {
      if (e.key === storeKey) {
        callback(getLocalNotifications());
      }
    };

    window.addEventListener('mock_notification_update', handleLocalUpdate);
    window.addEventListener('storage', handleCrossTabUpdate);

    // Polling backup
    let lastLength = getLocalNotifications().length;
    const intervalId = setInterval(() => {
      const current = getLocalNotifications();
      if (current.length !== lastLength) {
        lastLength = current.length;
        callback(current);
      }
    }, 900);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mock_notification_update', handleLocalUpdate);
      window.removeEventListener('storage', handleCrossTabUpdate);
    };
  } else {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory to bypass composite index requirements
      const sorted = [...notifications].sort((a: any, b: any) => 
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      callback(sorted);
    }, (error) => {
      console.error("[Firestore] Notifications listener error:", error);
    });

    return unsubscribe;
  }
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  if (isMockFirebase) {
    const storeKey = `mock_db_notifications_${userId}`;
    const notifications = JSON.parse(localStorage.getItem(storeKey) || '[]');
    const updated = notifications.map((n: any) => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem(storeKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mock_notification_update', { detail: { userId } }));
  } else {
    // Write update
    await writeDocument('notifications', notificationId, { read: true });
  }
};

export const listenToBookings = (
  fieldName: string,
  value: string,
  callback: (bookings: any[]) => void
) => {
  if (isMockFirebase) {
    const storeKey = `mock_db_bookings`;
    const getLocalBookings = () => {
      const items = JSON.parse(localStorage.getItem(storeKey) || '{}');
      const list = Object.values(items) as any[];
      const filtered = list.filter((item: any) => item[fieldName] === value);
      // Sort by absolute creation/date timestamp (newest first)
      return filtered.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });
    };

    callback(getLocalBookings());

    const handleLocalUpdate = () => {
      callback(getLocalBookings());
    };

    window.addEventListener('mock_booking_update', handleLocalUpdate);
    const intervalId = setInterval(() => {
      callback(getLocalBookings());
    }, 900);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mock_booking_update', handleLocalUpdate);
    };
  } else {
    const colRef = collection(db, 'bookings');
    const q = query(colRef, where(fieldName, '==', value));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      // Sort by absolute creation/date timestamp (newest first)
      const sorted = [...bookingsList].sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });
      callback(sorted);
    }, (error) => {
      console.error("[Firestore] Bookings listener error:", error);
    });

    return unsubscribe;
  }
};

export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  if (isMockFirebase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else {
    try {
      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.warn("[Firebase Storage] Upload failed. Falling back to Base64 data URL representation:", error);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }
};



export const sendInvitationEmail = async (
  workerEmail: string,
  workerName: string,
  clientName: string,
  clientId: string,
  clientEmail: string,
  category: string,
  city: string
): Promise<boolean> => {
  const recipientEmail = workerEmail || 'testingmail492@gmail.com';
  const subject = `🛠️ Khidmat Invitation: Customer ${clientName} needs a ${category}`;
  const inviteUrl = `${window.location.origin}/?action=accept-invite&clientId=${clientId}&clientEmail=${encodeURIComponent(clientEmail)}&clientName=${encodeURIComponent(clientName)}&category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`;
  const message = `Hello ${workerName},\n\nCustomer ${clientName} is looking for a ${category} in your city (${city}) right now!\n\nPlease click the link below to go ONLINE and notify the customer you are ready to work:\n\n${inviteUrl}\n\nBest regards,\nThe Khidmat Team`;

  console.log(`[FormSubmit Invitation Email] Routing to: ${recipientEmail}`);

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: subject,
        name: "Khidmat System (خدمت)",
        email: "invitations@khidmat.pk",
        message: message
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[FormSubmit] Invitation email dispatched successfully to ${recipientEmail}:`, data);
      return true;
    } else {
      console.warn(`[FormSubmit] Send invitation email response not OK`);
      return false;
    }
  } catch (error) {
    console.error(`[FormSubmit] Error dispatching email via FormSubmit:`, error);
    return false;
  }
};

export const createInvitationNotification = async (
  workerId: string,
  clientName: string,
  clientId: string,
  clientEmail: string,
  category: string,
  city: string
) => {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const message = `Customer ${clientName} requested you for a ${category} job in ${city}! Go online now to match.`;
  const newNotif = {
    id: notificationId,
    userId: workerId,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    type: 'invitation',
    metadata: {
      clientName,
      clientId,
      clientEmail,
      category,
      city
    }
  };
  
  if (isMockFirebase) {
    const storeKey = `mock_db_notifications_${workerId}`;
    const notifications = JSON.parse(localStorage.getItem(storeKey) || '[]');
    notifications.push(newNotif);
    localStorage.setItem(storeKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('mock_notification_update', { detail: { userId: workerId } }));
  } else {
    await writeDocument('notifications', notificationId, newNotif);
  }
};

export const createOnlineAlertNotification = async (
  clientId: string,
  workerId: string,
  workerName: string,
  category: string
) => {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const message = `Worker ${workerName} (${category}) has turned ONLINE! You can book them now.`;
  const newNotif = {
    id: notificationId,
    userId: clientId,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    type: 'online_alert',
    metadata: {
      providerId: workerId
    }
  };

  if (isMockFirebase) {
    const storeKey = `mock_db_notifications_${clientId}`;
    const notifications = JSON.parse(localStorage.getItem(storeKey) || '[]');
    notifications.push(newNotif);
    localStorage.setItem(storeKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('mock_notification_update', { detail: { userId: clientId } }));
  } else {
    await writeDocument('notifications', notificationId, newNotif);
  }
};

export const sendOnlineAlertEmail = async (
  clientEmail: string,
  workerName: string,
  clientName: string,
  category: string,
  city: string
): Promise<boolean> => {
  const recipientEmail = clientEmail || 'testingmail492@gmail.com';
  const subject = `🟢 Khidmat Alert: Worker ${workerName} is now ONLINE!`;
  const message = `Hello ${clientName},\n\nGreat news! The provider ${workerName} (${category}) in your city ${city} has turned ONLINE in response to your request!\n\nYou can now go to the Khidmat app and book their services immediately.\n\nBest regards,\nThe Khidmat Team`;

  console.log(`[FormSubmit Online Alert Email] Routing to: ${recipientEmail}`);

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: subject,
        name: "Khidmat System (خدمت)",
        email: "invitations@khidmat.pk",
        message: message
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[FormSubmit] Online alert email dispatched successfully to ${recipientEmail}:`, data);
      return true;
    } else {
      console.warn(`[FormSubmit] Send online alert email response not OK`);
      return false;
    }
  } catch (error) {
    console.error(`[FormSubmit] Error dispatching online alert email:`, error);
    return false;
  }
};

export { auth, db };
