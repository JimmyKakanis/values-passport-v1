import React, { useState, useEffect } from 'react';
import {
  getRecentSignatures,
  getTeacherSignatures,
  getStudent,
  deleteSignatureAsStaff,
  updateSignatureAsStaff,
  type SignatureTeacherEditable,
  type SignatureStaffActor,
} from '../services/dataService';
import { Signature, CoreValue, Subject, Teacher, UserRole } from '../types';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  User,
  Pencil,
  Trash2,
} from 'lucide-react';
import { EditMyStampModal } from './EditMyStampModal';

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
  const [mySignaturesList, setMySignaturesList] = useState<Signature[]>([]);
  /** Recent signatures (same query as grouped “All”) — used for admins’ flat, editable list. */
  const [recentSignaturesList, setRecentSignaturesList] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'all' | 'my'>('all');
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [currentTeacher]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      if (currentTeacher?.name) {
        const [recentSigs, mySigs] = await Promise.all([
          getRecentSignatures(100),
          getTeacherSignatures(currentTeacher.name)
        ]);
        setActivities(groupSignatures(recentSigs));
        setRecentSignaturesList(recentSigs);
        setMySignaturesList(mySigs);
      } else {
        const signatures = await getRecentSignatures(100);
        setActivities(groupSignatures(signatures));
        setRecentSignaturesList(signatures);
        setMySignaturesList([]);
      }
    } catch (error) {
      console.error("Failed to fetch activities", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const staffActor = (): SignatureStaffActor | null => {
    if (!currentTeacher?.name) return null;
    const role: UserRole =
      currentTeacher.role === 'ADMIN'
        ? 'ADMIN'
        : 'TEACHER';
    return { teacherName: currentTeacher.name, role };
  };

  const isAdminViewer = currentTeacher?.role === 'ADMIN';

  const handleDeleteStamp = async (sig: Signature) => {
    const actor = staffActor();
    if (!actor) return;
    const warnOtherTeacher =
      isAdminViewer && sig.teacherName !== actor.teacherName
        ? ' This stamp was awarded under another teacher’s name.'
        : '';
    if (
      !window.confirm(
        `Remove this stamp from the student's passport?${warnOtherTeacher} Students and families may have already seen it. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyDeleteId(sig.id);
    const res = await deleteSignatureAsStaff(sig.id, actor);
    setBusyDeleteId(null);
    if (res.ok) {
      await fetchActivities();
    } else {
      window.alert(res.message);
    }
  };

  const handleSaveEdit = async (updates: SignatureTeacherEditable): Promise<boolean> => {
    if (!editingSignature) return false;
    const actor = staffActor();
    if (!actor) return false;
    setEditError(null);
    setIsSavingEdit(true);
    const res = await updateSignatureAsStaff(editingSignature.id, actor, updates);
    setIsSavingEdit(false);
    if (res.ok) {
      setEditingSignature(null);
      await fetchActivities();
      return true;
    }
    setEditError(res.message);
    return false;
  };

  const renderManageableStampRow = (sig: Signature, canManage: boolean) => {
    const student = getStudent(sig.studentId);
    const studentData = {
      id: sig.studentId,
      name: student?.name || 'Unknown Student',
      avatar: student?.avatar || '',
    };
    return (
      <div
        key={sig.id}
        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {getInitials(sig.teacherName)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-bold text-gray-900">{sig.teacherName}</span>
                <span className="text-gray-500 text-sm"> awarded </span>
                <span className="font-bold text-emerald-700">{sig.value}</span>
                <span className="text-gray-500 text-sm"> in </span>
                <span className="font-medium text-gray-700">{sig.subject}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditError(null);
                        setEditingSignature(sig);
                      }}
                      disabled={busyDeleteId === sig.id}
                      className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40"
                      title="Edit stamp"
                      aria-label="Edit stamp"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStamp(sig)}
                      disabled={busyDeleteId === sig.id}
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      title="Delete stamp"
                      aria-label="Delete stamp"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                  <Clock size={12} />
                  {formatTime(sig.timestamp)}
                </span>
              </div>
            </div>

            {sig.subValue && (
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                <Tag size={10} />
                {sig.subValue}
              </div>
            )}

            {sig.note && (
              <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg italic border-l-2 border-emerald-200">
                &ldquo;{sig.note}&rdquo;
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <img src={studentData.avatar} className="w-6 h-6 rounded-full bg-gray-200" alt="" />
                <span className="text-sm font-medium text-gray-700">To {studentData.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const emptyMessage =
    activeSection === 'my'
      ? 'No stamps awarded by you yet.'
      : 'No recent activity found.';
  const myEmpty = mySignaturesList.length === 0;
  const allEmpty = isAdminViewer ? recentSignaturesList.length === 0 : activities.length === 0;
  const showEmpty = activeSection === 'my' ? myEmpty : allEmpty;
  const canEditAnyStampAsAdmin = Boolean(isAdminViewer && staffActor());

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

      {activeSection === 'my' && staffActor() && (
        <p className="text-xs text-gray-500 -mt-1 mb-2">
          Each row is one stamp. Use edit or delete to fix mistakes — the student passport updates for everyone straight away.
          {isAdminViewer && ' Admins can edit or delete their own awards here; use All Activity to manage any teacher’s stamps.'}
        </p>
      )}

      {activeSection === 'all' && canEditAnyStampAsAdmin && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 -mt-1 mb-2">
          Administrator view: recent stamps are listed one per row so you can edit or delete awards from any teacher. Standard
          teachers still see a grouped feed without these controls.
        </p>
      )}

      {showEmpty ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : activeSection === 'my' ? (
        mySignaturesList.map((sig) =>
          renderManageableStampRow(sig, Boolean(staffActor()))
        )
      ) : canEditAnyStampAsAdmin ? (
        recentSignaturesList.map((sig) => renderManageableStampRow(sig, true))
      ) : (
      activities.map((group) => {
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
                    &ldquo;{group.note}&rdquo;
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

      <EditMyStampModal
        signature={editingSignature}
        viewerMayEditAnyStamp={
          canEditAnyStampAsAdmin &&
          !!editingSignature &&
          editingSignature.teacherName.trim() !== currentTeacher?.name?.trim()
        }
        errorText={editError}
        isSubmitting={isSavingEdit}
        onClose={() => {
          setEditingSignature(null);
          setEditError(null);
        }}
        onSubmit={handleSaveEdit}
      />
    </div>
  );
};
