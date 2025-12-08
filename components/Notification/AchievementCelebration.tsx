import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import { Trophy, Star, X } from 'lucide-react';
import { StudentAchievement } from '../../types';

interface Props {
  achievement: StudentAchievement;
  onDismiss: () => void;
}

export const AchievementCelebration: React.FC<Props> = ({ achievement, onDismiss }) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Confetti 
        width={windowSize.width} 
        height={windowSize.height} 
        numberOfPieces={200}
        recycle={false}
      />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative text-center border-4 border-yellow-400 overflow-hidden"
      >
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />

        <div className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Trophy size={48} className="text-yellow-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Achievement Unlocked!</h2>
        <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg font-bold inline-block mb-4 border border-yellow-200">
          {achievement.title}
        </div>
        
        <p className="text-gray-600 mb-6">
          {achievement.description}
        </p>

        {achievement.reward && (
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6">
            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Reward Unlocked</h3>
            <p className="font-bold text-purple-900">{achievement.reward}</p>
          </div>
        )}

        <button 
          onClick={onDismiss}
          className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          Awesome!
        </button>

        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
};

