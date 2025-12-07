
import React, { useState, useEffect } from 'react';
import { addSignature, getPendingNominations, approveNomination, rejectNomination, getStudent } from '../services/dataService';
import { Student, Subject, CoreValue, Nomination } from '../types';
import { CORE_VALUES, SUBJECTS } from '../constants';
import { Check, X, Send, Users, Loader2, Search, Tag, Inbox, CheckCircle2, Clock, UserCheck } from 'lucide-react';


export const TeacherConsole: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [activeTab, setActiveTab] = useState<'AWARD' | 'INBOX'>('AWARD');
  
  // Award Form State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [selectedValue, setSelectedValue] = useState<CoreValue | ''>('');
  const [selectedSubValue, setSelectedSubValue] = useState<string>(''); // New sub-value state
  const [note, setNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inbox State
  const [pendingNominations, setPendingNominations] = useState<Nomination[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  
  useEffect(() => {
    const fetchNominations = async () => {
       const noms = await getPendingNominations();
       setPendingNominations(noms);
    };
    fetchNominations();
  }, [refreshTrigger, activeTab]);

  // Reset sub-value when main value changes
  useEffect(() => {
    setSelectedSubValue('');
  }, [selectedValue]);

  // Filter students based on search and exclude already selected ones
  const filteredStudents = students.filter(s => 
    (s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
    s.grade.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearchTerm.toLowerCase())) &&
    !selectedStudentIds.includes(s.id)
  );

  const handleStudentSelect = (student: Student) => {
    setSelectedStudentIds(prev => [...prev, student.id]);
    setStudentSearchTerm(''); 
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  const clearAllStudents = () => {
    setSelectedStudentIds([]);
    setStudentSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length > 0 && selectedSubject && selectedValue) {
      setIsSubmitting(true);
      // Award to all selected students
      const promises = selectedStudentIds.map(id => 
        addSignature(id, 'Current Teacher', selectedSubject, selectedValue, note, selectedSubValue)
      );
      
      await Promise.all(promises);
      setIsSubmitting(false);

      const count = selectedStudentIds.length;
      setSuccessMsg(`Awarded ${selectedValue} point to ${count} student${count > 1 ? 's' : ''}!`);
      
      // Reset form
      setNote('');
      setSelectedValue('');
      setSelectedSubValue('');
      setSelectedStudentIds([]);
      setStudentSearchTerm('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleApprove = async (nomination: Nomination) => {
    await approveNomination(nomination, 'Homeroom Teacher');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReject = async (id: string) => {
    await rejectNomination(id);
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <button
          onClick={() => setActiveTab('AWARD')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'AWARD' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          Award Signatures
        </button>
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'INBOX' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Inbox className="w-5 h-5" />
          Review Requests
          {pendingNominations.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingNominations.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'AWARD' ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 relative">
          <div className="bg-emerald-700 p-6 rounded-t-xl">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Teacher Console
            </h2>
            <p className="text-emerald-100 mt-1">Award signatures for positive behavior</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6 rounded-b-xl">
            {successMsg && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 animate-pulse border border-green-200">
                <Check className="w-5 h-5" />
                {successMsg}
              </div>
            )}

            <div className="relative z-20">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-blue-900">Student Search</label>
                {selectedStudentIds.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {selectedStudentIds.length} Selected
                  </span>
                )}
              </div>

              {/* Selected Students Chips */}
              {selectedStudentIds.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-inner">
                    {selectedStudentIds.map(id => {
                        const s = students.find(st => st.id === id);
                        return (
                            <div key={id} className="bg-white border border-emerald-200 shadow-sm text-emerald-900 pl-1 pr-2 py-1 rounded-full flex items-center gap-2 text-sm">
                                <img src={s?.avatar} className="w-6 h-6 rounded-full bg-gray-200" alt="" />
                                <span className="font-bold">{s?.name}</span>
                                <button 
                                  type="button" 
                                  onClick={() => removeStudent(id)} 
                                  className="bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full p-0.5 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                    <button 
                      type="button" 
                      onClick={clearAllStudents} 
                      className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 self-center font-medium"
                    >
                      Clear All
                    </button>
                 </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => {
                    setStudentSearchTerm(e.target.value);
                    setIsStudentDropdownOpen(true);
                  }}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  placeholder={selectedStudentIds.length > 0 ? "Search to add more students..." : "Type student name or email..."}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>

              {/* Autocomplete Dropdown */}
              {isStudentDropdownOpen && studentSearchTerm && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <div 
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                      >
                        <img src={student.avatar} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">{student.name}</div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                             <span>{student.grade}</span>
                             <span>{student.email}</span>
                          </div>
                        </div>
                        <div className="ml-auto text-emerald-600 text-xs font-bold uppercase opacity-0 hover:opacity-100">
                          Add +
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No students found matching "{studentSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <label className="block text-sm font-bold text-blue-900 mb-2">Subject Context</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select Class...</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-2">Value Demonstrated</label>
                <select 
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value as CoreValue)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select Value...</option>
                  {Object.values(CORE_VALUES).map(v => (
                    <option key={v.id} value={v.id}>{v.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Value "Tagging" System */}
            {selectedValue && (
               <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                 <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                   <Tag size={16} /> Specific Behavior (Optional Tag)
                 </h4>
                 
                 <div className="flex flex-wrap gap-2">
                   {CORE_VALUES[selectedValue].subValues.map((sv) => {
                     const isSelected = selectedSubValue === sv;
                     return (
                       <button
                         type="button"
                         key={sv}
                         onClick={() => setSelectedSubValue(isSelected ? '' : sv)}
                         className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                              : 'bg-white text-blue-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                         }`}
                       >
                         {sv}
                       </button>
                     );
                   })}
                 </div>
               </div>
            )}

            <div>
              <label className="block text-sm font-bold text-blue-900 mb-2">Notes (Optional)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
                placeholder="E.g., Helped clean up the classroom without being asked..."
              />
            </div>

            <button 
              type="submit" 
              disabled={selectedStudentIds.length === 0 || !selectedSubject || !selectedValue || isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg shadow transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
              {selectedStudentIds.length > 1 
                ? `Award Signature to ${selectedStudentIds.length} Students` 
                : 'Award Signature'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Inbox className="text-emerald-600" />
              Pending Requests ({pendingNominations.length})
            </h2>
            
            {pendingNominations.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No pending requests. All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingNominations.map(nom => {
                   const student = getStudent(nom.studentId);
                   return (
                    <div key={nom.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-gray-900">{student?.name}</span>
                             <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                               nom.type === 'SELF' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                             }`}>
                               {nom.type === 'SELF' ? 'Self-Advocacy' : `Nominated by ${nom.nominatorName}`}
                             </span>
                           </div>
                           <div className="text-sm text-gray-600 mb-2">
                             Requesting <strong>{nom.value}</strong> in <strong>{nom.subject}</strong>
                           </div>
                           <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border-l-2 border-emerald-200">
                             "{nom.reason}"
                           </div>
                           <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                             <Clock size={12} />
                             {new Date(nom.timestamp).toLocaleString()}
                           </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleApprove(nom)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg flex items-center justify-center transition-colors"
                            title="Approve"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleReject(nom.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg flex items-center justify-center transition-colors"
                            title="Reject"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                   );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
