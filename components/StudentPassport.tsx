
import React, { useState, useEffect } from 'react';
import { Award, Star, CheckCircle2, Loader2, BookOpen, MapPin } from 'lucide-react';
import { SUBJECTS, CORE_VALUES } from '../constants';
import { getSignaturesForStudent } from '../services/dataService';
import { CoreValue, Subject, Signature } from '../types';

interface Props {
  studentId: string;
}

const LOCATION_SUBJECTS: Subject[] = ['Homeroom', 'Playground', 'Sport', 'Excursions', 'Assembly', 'Sports Carnivals'];
const ACADEMIC_SUBJECTS: Subject[] = SUBJECTS.filter(s => !LOCATION_SUBJECTS.includes(s));

export const StudentPassport: React.FC<Props> = ({ studentId }) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sigs = await getSignaturesForStudent(studentId);
      setSignatures(sigs);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) {
     return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>;
  }

  // Helper to count signatures for a specific cell
  const getCount = (subject: Subject, value: CoreValue) => {
    return signatures.filter(s => s.subject === subject && s.value === value).length;
  };

  // Calculate Mastery Level
  const getMasteryLevel = (subject: Subject) => {
    const counts = Object.values(CORE_VALUES).map(val => getCount(subject, val.id as CoreValue));
    return Math.min(...counts);
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
                  <div key={val.id} className="flex flex-col items-center justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      count > 0 ? val.color : 'bg-gray-100 text-gray-400'
                    }`}>
                      {count > 0 ? count : '-'}
                    </div>
                    <span className="text-[9px] mt-1 text-gray-500 truncate w-full text-center">{val.id.split(' ')[0]}</span>
                  </div>
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
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-900 w-32 sticky left-0 bg-gray-50 z-20">Subject</th>
                {Object.values(CORE_VALUES).map((val) => (
                  <th key={val.id} className="px-2 py-3 text-center">
                    <div className={`inline-flex flex-col items-center gap-1 px-2 py-1 rounded-lg border ${val.color} bg-opacity-20 w-full`}>
                      <span className="font-bold truncate text-[10px] md:text-xs">{val.id}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-3 text-center w-24">Mastery</th>
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
                              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-sm border-2 font-bold text-sm md:text-base transform hover:scale-110 transition-transform ${val.color}`}>
                                {count}
                              </div>
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
