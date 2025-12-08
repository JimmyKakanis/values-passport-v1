import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { Toast } from './Toast';
import { AchievementCelebration } from './AchievementCelebration';

export const NotificationSystem: React.FC = () => {
  const { notifications, dismissNotification, celebration, dismissCelebration } = useData();

  return (
    <>
      {/* Toast Container - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          <AnimatePresence>
            {notifications.map(note => (
              <Toast
                key={note.id}
                {...note}
                onDismiss={dismissNotification}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {celebration && (
          <AchievementCelebration 
            achievement={celebration} 
            onDismiss={dismissCelebration} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

