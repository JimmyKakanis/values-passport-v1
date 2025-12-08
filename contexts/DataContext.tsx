import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Signature, StudentAchievement, CoreValue } from '../types';
import { subscribeToSignatures, subscribeToClaimedRewards, calculateStudentAchievements, getStudent } from '../services/dataService';

interface Notification {
  id: string;
  type: 'STAMP' | 'INFO';
  title: string;
  message: string;
  value?: CoreValue;
}

interface DataContextType {
  signatures: Signature[];
  achievements: StudentAchievement[];
  loading: boolean;
  refreshData: () => void;
  // Notification State
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  celebration: StudentAchievement | null;
  dismissCelebration: () => void;
}

const DataContext = createContext<DataContextType>({
  signatures: [],
  achievements: [],
  loading: true,
  refreshData: () => {},
  notifications: [],
  dismissNotification: () => {},
  celebration: null,
  dismissCelebration: () => {},
});

export const useData = () => useContext(DataContext);

interface DataProviderProps {
  children: React.ReactNode;
  studentId?: string; // Optional because teachers might use the app too, or unauth state
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, studentId }) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [claimedRewardIds, setClaimedRewardIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [celebration, setCelebration] = useState<StudentAchievement | null>(null);

  // Refs for diffing
  const prevSignaturesRef = useRef<Signature[]>([]);
  const prevAchievementsRef = useRef<StudentAchievement[]>([]);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!studentId) {
      setSignatures([]);
      setClaimedRewardIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    isFirstLoad.current = true;

    const unsubSig = subscribeToSignatures(studentId, (newSigs) => {
      setSignatures(newSigs);
      setLoading(false);
    });

    const unsubRewards = subscribeToClaimedRewards(studentId, (newIds) => {
      setClaimedRewardIds(newIds);
    });

    return () => {
      unsubSig();
      unsubRewards();
    };
  }, [studentId]);

  // Derived Achievements
  const achievements = React.useMemo(() => {
    return calculateStudentAchievements(signatures, claimedRewardIds);
  }, [signatures, claimedRewardIds]);

  // Diffing Logic for Notifications
  useEffect(() => {
    if (loading) return;

    // Skip notifications on first load to avoid spamming "New Stamp" for old data
    if (isFirstLoad.current) {
      prevSignaturesRef.current = signatures;
      prevAchievementsRef.current = achievements;
      isFirstLoad.current = false;
      return;
    }

    // 1. Check for New Signatures
    const newSignatures = signatures.filter(s => !prevSignaturesRef.current.find(prev => prev.id === s.id));
    
    if (newSignatures.length > 0) {
      const newNotes: Notification[] = newSignatures.map(sig => ({
        id: Date.now() + '-' + sig.id,
        type: 'STAMP',
        title: 'New Stamp Received!',
        message: `${sig.teacherName} awarded you a ${sig.value} stamp in ${sig.subject}.`,
        value: sig.value
      }));
      setNotifications(prev => [...prev, ...newNotes]);
    }

    // 2. Check for New Achievements
    const newAchievements = achievements.filter(ach => 
      ach.isUnlocked && 
      !prevAchievementsRef.current.find(prev => prev.id === ach.id)?.isUnlocked
    );

    if (newAchievements.length > 0) {
      // Prioritize the most difficult one if multiple unlocked
      // Or queue them? For simplicity, show the last one (most recent likely) or first.
      setCelebration(newAchievements[0]);
    }

    // Update Refs
    prevSignaturesRef.current = signatures;
    prevAchievementsRef.current = achievements;

  }, [signatures, achievements, loading]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissCelebration = () => {
    setCelebration(null);
  };

  const refreshData = () => {
    // No-op for realtime, but kept for interface compatibility if needed
  };

  return (
    <DataContext.Provider value={{
      signatures,
      achievements,
      loading,
      refreshData,
      notifications,
      dismissNotification,
      celebration,
      dismissCelebration
    }}>
      {children}
    </DataContext.Provider>
  );
};

