import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { X, Award, Star, Gift, CheckCircle } from 'lucide-react';
import { subscribeToSignatures, subscribeToClaimedRewards, calculateStudentAchievements, getStudentProfile, updateLastLogin } from '../services/dataService';
import { Signature } from '../types';
import { ACHIEVEMENTS } from '../constants';

// --- Types ---

export type NotificationType = 'STAMP' | 'ACHIEVEMENT' | 'REWARD' | 'INFO';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: React.ReactNode;
  duration?: number;
  metadata?: {
    subValue?: string;
    note?: string;
    teacher?: string;
    timestamp?: number;
  };
}

interface NotificationContextType {
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
}

// --- Context ---

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// --- Components ---

const Toast: React.FC<{ item: NotificationItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  useEffect(() => {
    if (item.duration) {
      const timer = setTimeout(() => {
        onRemove(item.id);
      }, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item, onRemove]);

  const getBgColor = () => {
    switch (item.type) {
      case 'ACHIEVEMENT': return 'bg-yellow-500';
      case 'REWARD': return 'bg-purple-600';
      case 'STAMP': return 'bg-emerald-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className={`${getBgColor()} text-white p-4 rounded-lg shadow-xl flex items-start gap-3 w-80 md:w-96 relative overflow-hidden`}
    >
      <div className="bg-white/20 p-2 rounded-full mt-1">
        {item.icon || <CheckCircle size={20} />}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm uppercase tracking-wide opacity-90">{item.title}</h4>
        <p className="text-sm font-medium mt-1 leading-snug">{item.message}</p>
        
        {/* Detail View for Metadata */}
        {(item.metadata?.subValue || item.metadata?.note) && (
          <div className="mt-3 bg-black/10 rounded-lg p-2 text-xs space-y-1">
             {item.metadata.subValue && (
                <div className="flex items-center gap-2">
                   <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">{item.metadata.subValue}</span>
                </div>
             )}
             {item.metadata.note && (
                <div className="mt-1">
                  <span className="text-[10px] uppercase font-bold opacity-75 block mb-0.5">Teacher Comment:</span>
                  <div className="italic opacity-90 border-l-2 border-white/30 pl-2 py-0.5">
                    "{item.metadata.note}"
                  </div>
                </div>
             )}
          </div>
        )}
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="text-white/70 hover:text-white transition-colors bg-black/10 hover:bg-black/20 p-1 rounded-full absolute top-2 right-2"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

const AchievementModal: React.FC<{ 
  item: NotificationItem; 
  onClose: () => void; 
}> = ({ item, onClose }) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          recycle={false} 
          numberOfPieces={500} 
          gravity={0.15}
        />
      </div>

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: 100 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10 text-center overflow-hidden"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-yellow-100 to-transparent -z-10" />
        
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-yellow-50 animate-bounce-slow">
           {item.type === 'REWARD' ? (
             <Gift className="w-12 h-12 text-purple-600" />
           ) : (
             <Award className="w-12 h-12 text-yellow-600" />
           )}
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
          {item.title}
        </h2>
        <p className="text-gray-600 mb-8 text-lg">
          {item.message}
        </p>

        <button
          onClick={onClose}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-all hover:scale-105"
        >
          Awesome!
        </button>
      </motion.div>
    </div>,
    document.body
  );
};

// --- Provider & Logic ---

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [modalQueue, setModalQueue] = useState<NotificationItem[]>([]);
  const [currentModal, setCurrentModal] = useState<NotificationItem | null>(null);

  const addNotification = (item: Omit<NotificationItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fullItem = { ...item, id };

    if (item.type === 'ACHIEVEMENT' || item.type === 'REWARD') {
      setModalQueue(prev => [...prev, fullItem]);
    } else {
      setNotifications(prev => [...prev, fullItem]);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Process Modal Queue
  useEffect(() => {
    if (!currentModal && modalQueue.length > 0) {
      setCurrentModal(modalQueue[0]);
      setModalQueue(prev => prev.slice(1));
    }
  }, [currentModal, modalQueue]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2 items-end">
          <AnimatePresence>
            {notifications.map(n => (
              <Toast key={n.id} item={n} onRemove={removeNotification} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {currentModal && (
          <AchievementModal 
            key={currentModal.id} 
            item={currentModal} 
            onClose={() => setCurrentModal(null)} 
          />
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

// --- Controller (Logic Bridge) ---

export const NotificationController: React.FC<{ studentId: string | null }> = ({ studentId }) => {
  const { addNotification } = useNotification();
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Refs to track previous state
  const prevSignaturesRef = useRef<Signature[]>([]);
  const prevClaimedRef = useRef<string[]>([]);
  const prevUnlockedRef = useRef<string[]>([]);
  const lastLoginRef = useRef<number | undefined>(undefined);
  const isInitialLoad = useRef(true);

  // 1. Fetch Profile to get Last Login
  useEffect(() => {
    if (!studentId) {
      setLoadingProfile(true);
      return;
    }
    
    const loadProfile = async () => {
       setLoadingProfile(true);
       try {
         const profile = await getStudentProfile(studentId);
         lastLoginRef.current = profile?.lastLoginAt;
       } catch (e) {
         console.error("Failed to load profile", e);
       } finally {
         setLoadingProfile(false);
       }
    };
    loadProfile();
  }, [studentId]);

  // 2. Subscriptions & Logic
  useEffect(() => {
    if (!studentId || loadingProfile) {
      // Reset refs on logout or loading
      prevSignaturesRef.current = [];
      prevClaimedRef.current = [];
      prevUnlockedRef.current = [];
      isInitialLoad.current = true;
      return;
    }

    // Subscribe to Signatures
    const unsubSig = subscribeToSignatures(studentId, (signatures) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/96e9d262-6711-49d1-a895-83baabb3cd28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationSystem.tsx:289',message:'Signatures Updated',data:{count: signatures.length, isInitial: isInitialLoad.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      
      // Calculate derived achievements
      const claimedIds = prevClaimedRef.current; // Use current claimed ref
      const achievements = calculateStudentAchievements(signatures, claimedIds);
      const unlockedIds = achievements.filter(a => a.isUnlocked).map(a => a.id);

      if (isInitialLoad.current) {
        // --- WELCOME BACK LOGIC ---
        // Only run if we have a lastLogin timestamp (meaning they've logged in before)
        if (lastLoginRef.current) {
           const newSinceLogin = signatures.filter(s => s.timestamp > (lastLoginRef.current || 0));
           
           if (newSinceLogin.length > 0) {
             addNotification({
                type: 'INFO',
                title: 'Welcome Back!',
                message: `You earned ${newSinceLogin.length} new stamps while you were away! Check your passport.`,
                icon: <Star className="w-5 h-5" />,
                duration: 8000
             });
           }
        }
        
        isInitialLoad.current = false;
        
        // Initialize prevUnlockedRef with currently unlocked achievements so they aren't detected as "new" on next pass
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/96e9d262-6711-49d1-a895-83baabb3cd28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationSystem.tsx:313',message:'Initial Load - Setting Refs',data:{unlockedCount: unlockedIds.length, sigCount: signatures.length, unlockedIds},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        prevUnlockedRef.current = unlockedIds;
        prevSignaturesRef.current = signatures;
        prevClaimedRef.current = claimedIds;
        
        updateLastLogin(studentId);

      } else {
        // --- REAL-TIME LOGIC ---
        // 1. Detect New Signatures
        const prevSigIds = new Set(prevSignaturesRef.current.map(s => s.id));
        const newSigs = signatures.filter(s => !prevSigIds.has(s.id));
        
        newSigs.forEach(sig => {
          setTimeout(() => {
             addNotification({
                type: 'STAMP',
                title: 'New Stamp!',
                message: `You earned a stamp for ${sig.value} in ${sig.subject}`,
                icon: <Star className="w-5 h-5" />,
                // No duration, persistent until dismissed
                metadata: {
                  subValue: sig.subValue,
                  note: sig.note,
                  teacher: sig.teacherName,
                  timestamp: sig.timestamp
                }
             });
          }, 500);
        });

        // 2. Detect New Achievements
        const prevUnlockedSet = new Set(prevUnlockedRef.current);
        const newUnlocked = unlockedIds.filter(id => !prevUnlockedSet.has(id));

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/96e9d262-6711-49d1-a895-83baabb3cd28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationSystem.tsx:355',message:'Achievements Updated',data:{prevUnlockedCount: prevUnlockedRef.current.length, newUnlockedCount: newUnlocked.length, newUnlocked},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion

        // HEURISTIC SAFEGUARD: If we are unlocking a huge number of achievements at once (>5) AND it matches the total count,
        // it's likely a bug where prevRef was lost. Suppress it.
        const isSuspiciousUpdate = newUnlocked.length > 5 && newUnlocked.length === unlockedIds.length;

        if (isSuspiciousUpdate) {
             console.warn("Suspicious achievement update detected (all achievements new). Suppressing notifications.");
             // #region agent log
             fetch('http://127.0.0.1:7242/ingest/96e9d262-6711-49d1-a895-83baabb3cd28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationSystem.tsx:365',message:'Suppressed Suspicious Update',data:{count: newUnlocked.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
             // #endregion
        } else {
            newUnlocked.forEach(achId => {
               const achDef = ACHIEVEMENTS.find(a => a.id === achId);
               if (achDef) {
                 addNotification({
                   type: 'ACHIEVEMENT',
                   title: 'Achievement Unlocked!',
                   message: `You've unlocked: ${achDef.title}`,
                   icon: <Award className="w-5 h-5" />,
                 });
               }
            });
        }
        
        // Update Refs for next pass
        prevSignaturesRef.current = signatures;
        prevUnlockedRef.current = unlockedIds;
      }
    });

    // Subscribe to Claimed Rewards
    const unsubClaimed = subscribeToClaimedRewards(studentId, (claimedIds) => {
        // We only care about real-time claims, not offline ones (since they were claimed by teacher, maybe in front of student)
        // But if we want to show "Reward Claimed" summary? 
        // Usually rewards are claimed manually so realtime notification is fine.
        
        // --- FIX: Prevent race condition where rewards load AFTER signatures flip isInitialLoad ---
        // If we haven't initialized our own tracking ref yet, do so now and skip notification
        if (prevClaimedRef.current.length === 0 && claimedIds.length > 0) {
             // Check if this is truly the first load of this data source
             // We can use a heuristic: if we have never seen any claims before, treat this as init.
             // But what if user really has 0 claims? Then claimedIds is empty and we do nothing.
             // If user has claims, we load them. If we notify now, we spam.
             // So, we should ALWAYS skip notification if prevClaimedRef was empty (initial state).
             // EXCEPT: What if the user had 0 claims, and just claimed one in real-time?
             // In that case, prevClaimedRef is empty, claimedIds has 1.
             // We need to distinguish "Page Load" from "Real-time Update".
             
             // We can use the global isInitialLoad.current BUT we know it might be false already.
             // So we rely on a separate ref for "rewards loaded" or just assume if signatures are still loading, we are loading.
             
             // BETTER FIX: If isInitialLoad is true, definitely suppress.
             // If isInitialLoad is FALSE, but we suspect this is the first time WE are running (because prev is empty and current is big list),
             // we might want to suppress. But that's risky.
             
             // SAFEST FIX: Only notify if the *difference* is small (e.g. 1 item). 
             // If we suddenly "claimed" 10 items, it's a data load.
             
             // Even better: Use a local ref to track if *this subscription* has run once.
        }

        if (!isInitialLoad.current) {
            const prevClaimedSet = new Set(prevClaimedRef.current);
            const newClaims = claimedIds.filter(id => !prevClaimedSet.has(id));

            // Only notify if we have previous history (meaning not first load) OR if the change is small (real-time)
            // If prevClaimedRef is empty, and we loaded > 0 items, and isInitialLoad is false... this is the race condition case.
            // We should suppress it.
            const isLikelyInitialLoadRace = prevClaimedRef.current.length === 0 && newClaims.length > 0;

            if (!isLikelyInitialLoadRace) {
                newClaims.forEach(claimId => {
                   const achDef = ACHIEVEMENTS.find(a => a.id === claimId);
                   if (achDef) {
                      addNotification({
                        type: 'REWARD',
                        title: 'Reward Claimed!',
                        message: `You claimed the reward for: ${achDef.title}`,
                        icon: <Gift className="w-5 h-5" />
                      });
                   }
                });
            }
        }
        prevClaimedRef.current = claimedIds;
    });

    return () => {
      unsubSig();
      unsubClaimed();
    };
  }, [studentId, loadingProfile, addNotification]);

  return null;
};

