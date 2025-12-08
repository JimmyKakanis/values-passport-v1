
import React, { useState, useEffect } from 'react';
import { Star, Loader2, BookOpen, MapPin, X, Calendar, User, MessageSquare } from 'lucide-react';
import { SUBJECTS, CORE_VALUES } from '../constants';
import { getSignaturesForStudent, subscribeToSignatures } from '../services/dataService';
import { CoreValue, Subject, Signature } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  studentId: string;
}

const LOCATION_SUBJECTS: Subject[] = ['Homeroom', 'Playground', 'Sport', 'Excursions', 'Assembly', 'Sports Carnivals'];
const ACADEMIC_SUBJECTS: Subject[] = SUBJECTS.filter(s => !LOCATION_SUBJECTS.includes(s));

// --- Modal for Stamp History ---
const StampHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  value: CoreValue | null;
  signatures: Signature[];
}> = ({ isOpen, onClose, subject, value, signatures }) => {
  if (!isOpen || !subject || !value) return null;

  const relevantSignatures = signatures.filter(
    s => s.subject === subject && s.value === value
  ).sort((a, b) => b.timestamp - a.timestamp); // Newest first

  const valueData = Object.values(CORE_VALUES).find(v => v.id === value);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className={`p-6 ${valueData?.color || 'bg-gray-100'} bg-opacity-10 border-b border-gray-100 flex justify-between items-start`}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${valueData?.color.replace('text-', 'bg-').replace('bg-opacity-20', '') || 'bg-gray-500'}`}>
                    {relevantSignatures.length}
                 </div>
                 {value} in {subject}
              </h3>
              <p className="text-gray-500 text-sm mt-1">Stamp History</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto p-4 space-y-3 flex-1">
             {relevantSignatures.length === 0 ? (
               <div className="text-center py-10 text-gray-400 italic">
                 No stamps collected yet.
               </div>
             ) : (
               relevantSignatures.map(sig => (
                 <div key={sig.id} className="border border-gray-100 rounded-lg p-4 shadow-sm bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                          <User size={14} />
                          {sig.teacherName}
                       </div>
                       <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={12} />
                          {new Date(sig.timestamp).toLocaleDateString()}
                       </div>
                    </div>
                    
                    {sig.subValue && (
                       <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold mb-2">
                          {sig.subValue}
                       </div>
                    )}

                    {sig.note && (
                       <div className="bg-white border-l-2 border-emerald-400 pl-3 py-2 text-sm text-gray-700 italic rounded-r-lg">
                          <MessageSquare size={12} className="inline mr-1 text-emerald-400 mb-0.5" />
                          "{sig.note}"
                       </div>
                    )}
                 </div>
               ))
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const StudentPassport: React.FC<Props> = ({ studentId }) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for modal
  const [selectedCell, setSelectedCell] = useState<{ subject: Subject, value: CoreValue } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSignatures(studentId, (sigs) => {
      setSignatures(sigs);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [studentId]);

  if (loading) {
     return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>;
  }

  // Helper to count stamps for a specific cell
  const getCount = (subject: Subject, value: CoreValue) => {
    return signatures.filter(s => s.subject === subject && s.value === value).length;
  };

  // Calculate Mastery Level
  const getMasteryLevel = (subject: Subject) => {
    const counts = Object.values(CORE_VALUES).map(val => getCount(subject, val.id as CoreValue));
    return Math.min(...counts);
  };

  const handleCellClick = (subject: Subject, value: CoreValue) => {
    const count = getCount(subject, value);
    if (count > 0) {
      setSelectedCell({ subject, value });
    }
  };

  const renderMobileSection = (title: string, subjects: Subject[], icon: React.ReactNode) => (
    <div className="space-y-4">
      <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
        {icon} {title}
      </h3>
      {subjects.map((subject) => {
        const masteryLevel = getMasteryLevel(subject);
        const isStarted = Object.values(CORE_VALUES).some(v => getCount(subject, v.id as CoreValue) > 0);
        
        return (
          <div key={subject} className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${masteryLevel > 0 ? 'border-yellow-400' : (isStarted ? 'border-blue-200' : 'border-gray-200')}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">{subject}</h3>
              <div className="flex gap-0.5">
                {masteryLevel > 0 ? (
                  [...Array(Math.min(5, masteryLevel))].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))
                ) : (
                  <Star className="w-4 h-4 text-gray-200" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.values(CORE_VALUES).map((val) => {
                const count = getCount(subject, val.id as CoreValue);
                return (
                  <button 
                    key={val.id} 
                    onClick={() => handleCellClick(subject, val.id as CoreValue)}
                    disabled={count === 0}
                    className={`flex flex-col items-center justify-center p-1 rounded-lg transition-colors ${count > 0 ? 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      count > 0 ? val.color : 'bg-gray-100 text-gray-400'
                    }`}>
                      {count > 0 ? count : '-'}
                    </div>
                    <span className="text-[9px] mt-1 text-gray-500 truncate w-full text-center">{val.id.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDesktopTable = (title: string, subjects: Subject[], icon: React.ReactNode) => (
    <div className="mb-8">
      <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg mb-4 px-1">
        {icon} {title}
      </h3>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-50 z-20 w-[14.28%]">Subject</th>
                {Object.values(CORE_VALUES).map((val) => (
                  <th key={val.id} className="px-2 py-3 text-center w-[14.28%]">
                    <div className={`inline-flex flex-col items-center gap-1 px-2 py-1 rounded-lg border ${val.color} bg-opacity-20 w-full`}>
                      <span className="font-bold truncate text-[10px] md:text-xs">{val.id}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-3 text-center w-[14.28%]">Mastery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => {
                 const masteryLevel = getMasteryLevel(subject);
                 
                 return (
                  <tr key={subject} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[150px] z-10" title={subject}>
                      {subject}
                    </td>
                    {Object.values(CORE_VALUES).map((val) => {
                      const count = getCount(subject, val.id as CoreValue);
                      return (
                        <td key={val.id} className="px-2 py-3 text-center p-0">
                          {count > 0 ? (
                            <div className="flex justify-center items-center">
                              <button 
                                onClick={() => handleCellClick(subject, val.id as CoreValue)}
                                className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-sm border-2 font-bold text-sm md:text-base transform hover:scale-110 transition-transform ${val.color}`}
                              >
                                {count}
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-dashed border-gray-200" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-center">
                       <div className="flex justify-center items-center gap-0.5" title={`Mastery Level: ${masteryLevel}`}>
                          {masteryLevel > 0 ? (
                            // Render stars up to 5
                            [...Array(Math.min(5, masteryLevel))].map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                            ))
                          ) : (
                            <Star className="w-4 h-4 text-gray-200" />
                          )}
                          {/* Add a plus if they have more than 5 sets (rare but possible) */}
                          {masteryLevel > 5 && <span className="text-xs font-bold text-yellow-600">+</span>}
                       </div>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
       <StampHistoryModal 
          isOpen={!!selectedCell} 
          onClose={() => setSelectedCell(null)}
          subject={selectedCell?.subject || null}
          value={selectedCell?.value || null}
          signatures={signatures}
       />
       {/* Mobile View */}
       <div className="md:hidden space-y-8">
          {renderMobileSection("Academic Subjects", ACADEMIC_SUBJECTS, <BookOpen className="text-emerald-600" />)}
          {renderMobileSection("Locations and Events", LOCATION_SUBJECTS, <MapPin className="text-orange-500" />)}
       </div>

      {/* Desktop View */}
      <div className="hidden md:block">
          {renderDesktopTable("Academic Subjects", ACADEMIC_SUBJECTS, <BookOpen className="text-emerald-600" />)}
          {renderDesktopTable("Locations and Events", LOCATION_SUBJECTS, <MapPin className="text-orange-500" />)}
      </div>
    </div>
  );
};
