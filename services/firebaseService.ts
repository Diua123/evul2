
import { 
  collection, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  getDocs,
  where,
  increment,
  limit
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";
import { UserPost, Comment, Publication, Message, User, LibraryItem, SystemConfig, Announcement, SystemNotification } from "../types";

// --- USERS ---
export const getUsersFB = async (): Promise<User[]> => {
  if (!isFirebaseConfigured || !auth?.currentUser) return [];
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  })) as User[];
};

export const getUserFB = async (userId: string): Promise<User | null> => {
  if (!isFirebaseConfigured) return null;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { ...userSnap.data(), id: userSnap.id } as User;
  }
  
  // Fallback if the user was saved with a custom 'id' field instead of document ID
  const userDoc = await getDocs(query(collection(db, "users"), where("id", "==", userId)));
  if (userDoc.empty) return null;
  return { ...userDoc.docs[0].data(), id: userDoc.docs[0].id } as User;
};

export const createUserFB = async (user: User) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const userRef = doc(db, "users", user.id);
  await setDoc(userRef, user);
  return { id: user.id };
};

export const updateUserFB = async (docId: string, data: Partial<User>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const userRef = doc(db, "users", docId);
  return await updateDoc(userRef, data);
};

export const updateUserStatusFB = async (userId: string, isOnline: boolean) => {
  if (!isFirebaseConfigured || !auth?.currentUser) return;
  try {
    // Se o ID corresponder ao utilizador atualmente autenticado, atualizamos diretamente
    if (auth.currentUser.uid === userId) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: Date.now()
      });
      return;
    }

    // Primeiro tentamos encontrar o documento pelo campo 'id' customizado
    const q = query(collection(db, "users"), where("id", "==", userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, "users", userDoc.id), {
        isOnline,
        lastSeen: Date.now()
      });
    } else {
      // Se não encontrar pelo 'id' customizado, tenta pelo ID do documento
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: Date.now()
      });
    }
  } catch (err) {
    console.error("Erro ao atualizar status online:", err);
  }
};

export const subscribeToUsers = (callback: (users: User[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit to reduce data consumption
  const q = query(collection(db, "users"), limit(100));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as User[];
    callback(users);
  }, (err) => {
    console.warn("Permission denied or error fetching users:", err);
    callback([]);
  });
};

// --- POSTS (Feed) ---
export const subscribeToPosts = (callback: (posts: UserPost[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit and orderBy to reduce data consumption
  // Single field orderBy does not require a composite index
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as UserPost[];
    
    // Sort by timestamp descending
    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    callback(posts);
  }, (err) => {
    console.warn("Permission denied or error fetching posts:", err);
    callback([]);
  });
};

export const addPostFB = async (post: Omit<UserPost, 'id'>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  return await addDoc(collection(db, "posts"), {
    ...post,
    timestamp: new Date().toISOString()
  });
};

export const likePostFB = async (postId: string, userId: string, isLiked: boolean) => {
  if (!isFirebaseConfigured) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    likes: isLiked ? increment(-1) : increment(1)
  });
};

// Helper to get current likes count (simplified)
const getDocCount = async (postId: string, field: string) => {
  return 0; 
};

export const addCommentFB = async (postId: string, comment: Comment) => {
  if (!isFirebaseConfigured) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    comments: arrayUnion(comment)
  });
};

export const deletePostFB = async (postId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "posts", postId));
};

export const updatePostFB = async (postId: string, data: Partial<UserPost>) => {
  if (!isFirebaseConfigured) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, data);
};

export const updateCommentsFB = async (postId: string, comments: Comment[]) => {
  if (!isFirebaseConfigured) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { comments });
};

// --- PUBLICATIONS (Communities) ---
export const subscribeToPublications = (callback: (pubs: Publication[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit and orderBy to reduce data consumption
  const q = query(collection(db, "publications"), orderBy("date", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const pubs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as any[];
    
    // Sort by date descending
    pubs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    callback(pubs);
  }, (err) => {
    console.warn("Permission denied or error fetching publications:", err);
    callback([]);
  });
};

export const addPublicationFB = async (pub: Omit<Publication, 'id'>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  return await addDoc(collection(db, "publications"), {
    ...pub,
    date: new Date().toISOString()
  });
};

export const deletePublicationFB = async (pubId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "publications", pubId));
};

// --- CHAT ---
export const subscribeToAllMyMessages = (userId: string, callback: (messages: Message[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit and orderBy to reduce data consumption
  const q = query(collection(db, "messages"), orderBy("time", "desc"), limit(150));
  
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as Message))
      .filter(m => m.to === userId || m.authorId === userId || m.to === 'general')
      .sort((a, b) => a.time - b.time);
    callback(msgs);
  }, (err) => {
    console.warn("Permission denied or error fetching messages:", err);
    callback([]);
  });
};

export const subscribeToMessages = (userId1: string, userId2: string, callback: (messages: Message[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Fetch recent messages globally, then filter in memory to avoid composite index
  const q = query(collection(db, "messages"), orderBy("time", "desc"), limit(150));
  
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as Message))
      .filter(m => 
        (m.to === userId1 && m.authorId === userId2) || 
        (m.to === userId2 && m.authorId === userId1) ||
        (m.to === 'general' && (userId1 === 'general' || userId2 === 'general'))
      )
      .sort((a, b) => a.time - b.time);
    callback(msgs);
  }, (err) => {
    console.warn("Permission denied or error fetching messages between users:", err);
    callback([]);
  });
};

export const subscribeToGeneralChat = (callback: (messages: Message[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Fetch recent messages globally, then filter in memory to avoid composite index
  const q = query(collection(db, "messages"), orderBy("time", "desc"), limit(150));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as Message))
      .filter(m => m.to === "general")
      .sort((a, b) => a.time - b.time);
    callback(msgs);
  }, (err) => {
    console.warn("Permission denied or error fetching general chat:", err);
    callback([]);
  });
};

export const sendMessageFB = async (message: Message) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const { id, ...msgData } = message;
  return await addDoc(collection(db, "messages"), {
    ...msgData,
    time: Date.now()
  });
};

export const updateMessageFB = async (messageId: string, text: string) => {
  if (!isFirebaseConfigured) return;
  const msgRef = doc(db, "messages", messageId);
  await updateDoc(msgRef, { text });
};

export const deleteMessageFB = async (messageId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "messages", messageId));
};

// --- LIBRARY ---
export const subscribeToAllLibraryItems = (callback: (items: LibraryItem[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit to reduce data consumption
  const q = query(collection(db, "library"), limit(100));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as LibraryItem[];
    callback(items);
  }, (err) => {
    console.warn("Permission denied or error fetching library items:", err);
    callback([]);
  });
};

export const subscribeToLibrary = (category: string, callback: (items: LibraryItem[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  // Added limit to reduce data consumption
  const q = query(collection(db, "library"), where("category", "==", category), limit(100));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as LibraryItem[];
    
    // Ordenar por data decrescente
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    callback(items);
  }, (err) => {
    console.warn("Permission denied or error fetching category library items:", err);
    callback([]);
  });
};

export const addLibraryItemFB = async (item: Omit<LibraryItem, 'id'>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  return await addDoc(collection(db, "library"), {
    ...item,
    date: new Date().toISOString().split('T')[0]
  });
};

export const deleteLibraryItemFB = async (itemId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "library", itemId));
};

// --- SYSTEM CONFIG ---
export const subscribeToSystemConfig = (callback: (config: SystemConfig) => void) => {
  if (!isFirebaseConfigured) {
    callback({ logoUrl: "up.png", slides: [] });
    return () => {};
  }
  const configRef = doc(db, "system_config", "app");
  return onSnapshot(configRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SystemConfig);
    } else {
      callback({ logoUrl: "up.png", slides: [] });
    }
  }, (err) => {
    console.warn("Permission denied or error fetching system config:", err);
    callback({ logoUrl: "up.png", slides: [] });
  });
};

export const updateSystemConfigFB = async (data: Partial<SystemConfig>) => {
  if (!isFirebaseConfigured) return;
  const configRef = doc(db, "system_config", "app");
  const snap = await getDoc(configRef);
  if (snap.exists()) {
    await updateDoc(configRef, data);
  } else {
    await setDoc(configRef, {
      logoUrl: "up.png",
      slides: [],
      ...data
    });
  }
};

// --- ANNOUNCEMENTS ---
export const subscribeToAnnouncements = (callback: (announcements: Announcement[]) => void) => {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "announcements"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Announcement[];
    // Sort descending by createdAt in client to avoid requiring an index
    announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(announcements);
  }, (err) => {
    console.warn("Permission denied or error fetching announcements:", err);
    callback([]);
  });
};

export const addAnnouncementFB = async (announcement: Omit<Announcement, 'id'>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  return await addDoc(collection(db, "announcements"), {
    ...announcement,
    createdAt: new Date().toISOString()
  });
};

export const deleteAnnouncementFB = async (announcementId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "announcements", announcementId));
};

// --- SYSTEM & INDIVIDUAL NOTIFICATIONS ---
export const subscribeToMyNotifications = (userId: string, callback: (notifications: SystemNotification[]) => void) => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "notifications"), limit(100));
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as SystemNotification[];
    const filtered = all.filter(n => n.targetUserId === "all" || n.targetUserId === userId);
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(filtered);
  }, (err) => {
    console.warn("Permission denied or error fetching notifications:", err);
    callback([]);
  });
};

export const addNotificationFB = async (notification: Omit<SystemNotification, 'id'>) => {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  return await addDoc(collection(db, "notifications"), {
    ...notification,
    createdAt: new Date().toISOString()
  });
};

// --- USER MANAGEMENT ---
export const deleteUserFB = async (userId: string) => {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, "users", userId));
};

export const updateUserRoleFB = async (userId: string, role: 'student' | 'chefe' | 'docente', anoFrequencia: number) => {
  if (!isFirebaseConfigured) return;
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { role, anoFrequencia });
};

