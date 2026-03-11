import React, { useState, useEffect } from 'react';
import { getRecentSignatures, getStudent } from '../services/dataService';
import { Signature, CoreValue, Subject, Teacher } from '../types';
import { Clock, ChevronDown, ChevronUp, Tag, Users, User } from 'lucide-react';

interface TeacherActivityFeedProps {
  currentTeacher?: Teacher | null;
}

interface GroupedActivity {
  id: string; // Use the id of the first signature as the group id
  teacherName: string;
  subject: Subject;
  value: CoreValue;
  subValue?: string;
  note?: string;
  timestamp: number;
  students: { id: string; name: string; avatar: string }[];
  count: number;
}

export const TeacherActivityFeed: React.FC<TeacherActivityFeedProps> = ({ currentTeacher }) => {
  const [activities, setActivities] = useState<GroupedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'all' | 'my'>('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const signatures = await getRecentSignatures(100); // Fetch last 100
      const grouped = groupSignatures(signatures);
      setActivities(grouped);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    } finally {
      setIsLoading(false);
    }
  };

  const myActivities = currentTeacher?.name
    ? activities.filter((g) => g.teacherName === currentTeacher.name)
    : [];

  const createNewGroup = (sig: Signature, student: { id: string; name: string; avatar: string }): GroupedActivity => {
    return {
      id: sig.id,
      teacherName: sig.teacherName,
      subject: sig.subject,
      value: sig.value,
      subValue: sig.subValue,
      note: sig.note,
      timestamp: sig.timestamp,
      students: [student],
      count: 1,
    };
  };

  const groupSignatures = (signatures: Signature[]): GroupedActivity[] => {
    if (signatures.length === 0) return [];

    const groups: GroupedActivity[] = [];
    let currentGroup: GroupedActivity | null = null;

    // Signatures are already sorted by timestamp desc
    signatures.forEach((sig) => {
      const student = getStudent(sig.studentId);
      const studentData = {
        id: sig.studentId,
        name: student?.name || 'Unknown Student',
        avatar: student?.avatar || '',
      };

      if (!currentGroup) {
        currentGroup = createNewGroup(sig, studentData);
      } else {
        // Check if this signature belongs to the current group
        const isSameTeacher = currentGroup.teacherName === sig.teacherName;
        const isSameSubject = currentGroup.subject === sig.subject;
        const isSameValue = currentGroup.value === sig.value;
        const isSameSubValue = currentGroup.subValue === sig.subValue;
        const isSameNote = (currentGroup.note || '') === (sig.note || '');
        const isCloseTime = Math.abs(currentGroup.timestamp - sig.timestamp) < 2 * 60 * 1000; // 2 minutes

        if (isSameTeacher && isSameSubject && isSameValue && isSameSubValue && isSameNote && isCloseTime) {
          // Add to current group
          currentGroup.students.push(studentData);
          currentGroup.count++;
        } else {
          // Push current group and start new one
          groups.push(currentGroup);
          currentGroup = createNewGroup(sig, studentData);
        }
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getInitials = (name: string): string => {
    const honorifics = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'dame'];
    const parts = name.trim().split(/\s+/).filter(
      (p) => p.length > 0 && !honorifics.includes(p.toLowerCase().replace(/\.$/, ''))
    );
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const displayActivities = activeSection === 'my' ? myActivities : activities;
  const emptyMessage = activeSection === 'my'
    ? 'No stamps awarded by you yet.'
    : 'No recent activity found.';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
             <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
               <button
                 onClick={() => setActiveSection('all')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                   activeSection === 'all' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 <Users size={16} /> All Activity
               </button>
               <button
                 onClick={() => setActiveSection('my')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                   activeSection === 'my' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 <User size={16} /> My Activity
               </button>
             </div>
             <button 
                onClick={fetchActivities}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium self-start sm:self-center"
             >
                Refresh
             </button>
        </div>

      {displayActivities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
      displayActivities.map((group) => {
        const isExpanded = expandedGroups.has(group.id);
        const hasManyStudents = group.count > 1;
        
        return (
          <div key={group.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {/* Teacher Avatar/Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {getInitials(group.teacherName)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900">{group.teacherName}</span>
                    <span className="text-gray-500 text-sm"> awarded </span>
                    <span className="font-bold text-emerald-700">{group.value}</span>
                    <span className="text-gray-500 text-sm"> in </span>
                    <span className="font-medium text-gray-700">{group.subject}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(group.timestamp)}
                  </span>
                </div>

                {group.subValue && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    <Tag size={10} />
                    {group.subValue}
                  </div>
                )}

                {group.note && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg italic border-l-2 border-emerald-200">
                    "{group.note}"
                  </div>
                )}

                {/* Students Section */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {hasManyStudents ? (
                    <div>
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors"
                        onClick={() => toggleGroup(group.id)}
                      >
                         <div className="flex -space-x-2">
                            {group.students.slice(0, 3).map((s) => (
                                <img 
                                    key={s.id} 
                                    src={s.avatar} 
                                    alt={s.name}
                                    className="w-6 h-6 rounded-full border-2 border-white bg-gray-200"
                                    title={s.name}
                                />
                            ))}
                         </div>
                         <div className="text-sm text-gray-600 font-medium">
                            To {group.students[0].name.split(' ')[0]} and {group.count - 1} others
                         </div>
                         {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                      
                      {isExpanded && (
                         <div className="mt-2 pl-2 grid grid-cols-2 gap-2 text-sm">
                            {group.students.map(s => (
                                <div key={s.id} className="flex items-center gap-2">
                                    <img src={s.avatar} className="w-5 h-5 rounded-full bg-gray-100" alt="" />
                                    <span className="truncate text-gray-700">{s.name}</span>
                                </div>
                            ))}
                         </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                       <img src={group.students[0].avatar} className="w-6 h-6 rounded-full bg-gray-200" alt="" />
                       <span className="text-sm font-medium text-gray-700">To {group.students[0].name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })
      )}
    </div>
  );
};
