import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Info } from 'lucide-react';
import { CoreValue } from '../../types';
import { CORE_VALUES } from '../../constants';

interface ToastProps {
  id: string;
  type: 'STAMP' | 'INFO';
  title: string;
  message: string;
  value?: CoreValue;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, title, message, value, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const bgColor = value ? CORE_VALUES[value].color.replace('text', 'bg').replace('700', '100') : 'bg-blue-100';
  const borderColor = value ? CORE_VALUES[value].color.replace('text', 'border').replace('700', '200') : 'border-blue-200';
  const iconColor = value ? CORE_VALUES[value].color : 'text-blue-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`relative w-80 md:w-96 p-4 rounded-lg shadow-lg border-l-4 ${bgColor} ${borderColor} flex gap-3 backdrop-blur-sm bg-opacity-95`}
    >
      <div className={`p-2 rounded-full bg-white bg-opacity-50 h-fit ${iconColor}`}>
        {type === 'STAMP' ? <Award size={20} /> : <Info size={20} />}
      </div>
      <div className="flex-1">
        <h4 className={`font-bold text-sm ${iconColor} opacity-90`}>{title}</h4>
        <p className="text-xs text-gray-700 mt-1">{message}</p>
      </div>
      <button 
        onClick={() => onDismiss(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors h-fit"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

