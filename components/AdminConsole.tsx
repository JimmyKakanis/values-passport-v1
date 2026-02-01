import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Shield,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Student, Teacher, SystemSettings } from '../types';
import { 
  getAllStudents, 
  getAllTeachers, 
  getSystemSettings, 
  addStudent, 
  updateStudent, 
  deleteStudent,
  addTeacher,
  removeTeacher,
  updateSubjects,
  seedDatabase,
  resetAllProgress
} from '../services/dataService';

export const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'TEACHERS' | 'SETTINGS' | 'MIGRATION'>('STUDENTS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Student Management State
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: '', email: '', grade: '' });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Teacher Management State
  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({ name: '', email: '' });
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);

  // Settings Management State
  const [newSubject, setNewSubject] = useState('');

  // Load Initial Data
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'STUDENTS') {
        const data = await getAllStudents();
        setStudents(data);
      } else if (activeTab === 'TEACHERS') {
        const data = await getAllTeachers();
        setTeachers(data);
      } else if (activeTab === 'SETTINGS') {
        const data = await getSystemSettings();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await seedDatabase();
      if (result.success) {
        setSuccess('Database seeded successfully!');
        loadData();
      } else {
        setError(`Failed to seed database: ${result.error}`);
      }
    } catch (err: any) {
      setError(`Error during seeding: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm("Are you sure you want to RESET ALL SCORES AND STAMPS? This will delete all student progress but keep student accounts. This cannot be undone.")) return;

    setLoading(true);
    try {
      const result = await resetAllProgress();
      if (result.success) {
        setSuccess('All progress (stamps, rewards, scores) has been reset!');
        loadData();
      } else {
        setError(`Failed to reset progress: ${result.error}`);
      }
    } catch (err: any) {
      setError(`Error during reset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Student Handlers
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.grade) return;
    
    setLoading(true);
    const studentToAdd = {
        name: newStudent.name,
        email: newStudent.email,
        grade: newStudent.grade,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStudent.name.replace(' ', '')}&backgroundColor=b6e3f4`
    };

    const result = await addStudent(studentToAdd as any);
    setLoading(false);
    
    if (result) {
        setSuccess('Student added successfully');
        setNewStudent({ name: '', email: '', grade: '' });
        setIsAddStudentOpen(false);
        loadData();
    } else {
        setError('Failed to add student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    setLoading(true);
    const result = await updateStudent(editingStudent.id, {
        name: editingStudent.name,
        email: editingStudent.email,
        grade: editingStudent.grade
    });
    setLoading(false);

    if (result) {
        setSuccess('Student updated successfully');
        setEditingStudent(null);
        loadData();
    } else {
        setError('Failed to update student');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if(!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    
    setLoading(true);
    const result = await deleteStudent(id);
    setLoading(false);
    
    if (result) {
        setSuccess('Student deleted');
        loadData();
    } else {
        setError('Failed to delete student');
    }
  };

  // Teacher Handlers
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name || !newTeacher.email) return;
    
    setLoading(true);
    const result = await addTeacher({
        name: newTeacher.name,
        email: newTeacher.email,
        role: 'TEACHER'
    } as Teacher);
    setLoading(false);

    if (result) {
        setSuccess('Teacher added successfully');
        setNewTeacher({ name: '', email: '' });
        setIsAddTeacherOpen(false);
        loadData();
    } else {
        setError('Failed to add teacher');
    }
  };

  const handleRemoveTeacher = async (id: string) => {
    if(!window.confirm('Are you sure you want to remove this teacher? They will lose access immediately.')) return;
    
    setLoading(true);
    const result = await removeTeacher(id);
    setLoading(false);

    if (result) {
        setSuccess('Teacher removed');
        loadData();
    } else {
        setError('Failed to remove teacher');
    }
  };

  // Settings Handlers
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !settings) return;
    
    if (settings.subjects.includes(newSubject)) {
        setError('Subject already exists');
        return;
    }

    setLoading(true);
    const updatedSubjects = [...settings.subjects, newSubject];
    const result = await updateSubjects(updatedSubjects);
    setLoading(false);

    if (result) {
        setSuccess('Subject added');
        setNewSubject('');
        loadData();
    } else {
        setError('Failed to add subject');
    }
  };

  const handleRemoveSubject = async (subjectToRemove: string) => {
    if (!settings) return;
    if(!window.confirm(`Are you sure you want to remove ${subjectToRemove}?`)) return;

    setLoading(true);
    const updatedSubjects = settings.subjects.filter(s => s !== subjectToRemove);
    const result = await updateSubjects(updatedSubjects);
    setLoading(false);

    if (result) {
        setSuccess('Subject removed');
        loadData();
    } else {
        setError('Failed to remove subject');
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-emerald-800" /> 
            Admin Console
          </h1>
          <p className="text-gray-500">Manage users, roles, and system settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'STUDENTS' 
              ? 'bg-emerald-100 text-emerald-900' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <GraduationCap size={20} /> Students
        </button>
        <button
          onClick={() => setActiveTab('TEACHERS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'TEACHERS' 
              ? 'bg-emerald-100 text-emerald-900' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users size={20} /> Teachers
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'SETTINGS' 
              ? 'bg-emerald-100 text-emerald-900' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BookOpen size={20} /> Subjects & Settings
        </button>
        <button
          onClick={() => setActiveTab('MIGRATION')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'MIGRATION' 
              ? 'bg-yellow-100 text-yellow-900' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle size={20} /> Data Migration
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <Shield size={20} /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-emerald-800">
            <Loader2 className="animate-spin h-8 w-8 mr-2" /> Loading...
          </div>
        ) : (
          <>
            {activeTab === 'STUDENTS' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Student Directory</h2>
                    <button 
                        onClick={() => setIsAddStudentOpen(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 font-bold"
                    >
                        <Plus size={20} /> Add Student
                    </button>
                </div>

                {/* Add Student Form */}
                {isAddStudentOpen && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3">Add New Student</h3>
                        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                className="p-2 border rounded"
                                value={newStudent.name}
                                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                                required
                            />
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                className="p-2 border rounded"
                                value={newStudent.email}
                                onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Grade (e.g. Year 7)" 
                                className="p-2 border rounded"
                                value={newStudent.grade}
                                onChange={e => setNewStudent({...newStudent, grade: e.target.value})}
                                required
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold flex-1">Save</button>
                                <button type="button" onClick={() => setIsAddStudentOpen(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search students by name or email..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b">
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Grade</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-emerald-900 flex items-center gap-3">
                                        <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full bg-gray-100" />
                                        {editingStudent?.id === student.id ? (
                                            <input 
                                                className="border p-1 rounded" 
                                                value={editingStudent.name} 
                                                onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                                            />
                                        ) : (
                                            student.name
                                        )}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        {editingStudent?.id === student.id ? (
                                            <input 
                                                className="border p-1 rounded" 
                                                value={editingStudent.email} 
                                                onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                                            />
                                        ) : (
                                            student.email
                                        )}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        {editingStudent?.id === student.id ? (
                                            <input 
                                                className="border p-1 rounded w-24" 
                                                value={editingStudent.grade} 
                                                onChange={e => setEditingStudent({...editingStudent, grade: e.target.value})}
                                            />
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{student.grade}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {editingStudent?.id === student.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleUpdateStudent} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18} /></button>
                                                <button onClick={() => setEditingStudent(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingStudent(student)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Edit"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Delete"><Trash2 size={18} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        No students found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
            )}

            {activeTab === 'TEACHERS' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Authorized Teachers</h2>
                    <button 
                        onClick={() => setIsAddTeacherOpen(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 font-bold"
                    >
                        <Plus size={20} /> Add Teacher
                    </button>
                </div>

                {/* Add Teacher Form */}
                {isAddTeacherOpen && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3">Add New Teacher</h3>
                        <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                className="p-2 border rounded"
                                value={newTeacher.name}
                                onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                                required
                            />
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                className="p-2 border rounded"
                                value={newTeacher.email}
                                onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                                required
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold flex-1">Save</button>
                                <button type="button" onClick={() => setIsAddTeacherOpen(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b">
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map(teacher => (
                                <tr key={teacher.id || teacher.email} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-emerald-900">{teacher.name}</td>
                                    <td className="p-3 text-gray-600">{teacher.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${teacher.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {teacher.role || 'TEACHER'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button 
                                            onClick={() => teacher.id && handleRemoveTeacher(teacher.id)} 
                                            className="text-red-600 hover:bg-red-50 p-1 rounded" 
                                            title="Remove Access"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        No teachers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div>
                <h2 className="text-xl font-bold mb-4">System Settings</h2>
                
                <div className="mb-8">
                    <h3 className="font-bold text-gray-700 mb-3">Manage Subjects</h3>
                    <p className="text-sm text-gray-500 mb-4">These subjects appear in the signature forms and passport.</p>
                    
                    <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="New Subject Name" 
                            className="flex-1 p-2 border rounded"
                            value={newSubject}
                            onChange={e => setNewSubject(e.target.value)}
                        />
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold">Add</button>
                    </form>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {settings?.subjects.map(subject => (
                            <div key={subject} className="bg-emerald-50 p-3 rounded flex justify-between items-center border border-emerald-100">
                                <span className="font-medium text-emerald-900">{subject}</span>
                                <button 
                                    onClick={() => handleRemoveSubject(subject)}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'MIGRATION' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-yellow-800">Data Management</h2>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-900 mb-2">Initialize Database</h3>
                    <p className="text-gray-700 mb-4 text-sm">
                        Use this tool to populate the database with the initial hardcoded data from <code>constants.ts</code>.
                        This is useful for first-time setup or restoring missing student lists.
                    </p>
                    <button
                        onClick={handleSeed}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold transition-colors"
                    >
                        Seed Database from Constants
                    </button>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-bold text-red-900 mb-2">Reset Student Progress</h3>
                    <p className="text-gray-700 mb-4 text-sm">
                        <strong className="text-red-600">WARNING:</strong> This will delete all stamps, signatures, claimed rewards, quiz scores, and pending nominations. 
                        Student accounts and settings will remain. Use this before starting a new term or testing period.
                    </p>
                    <button
                        onClick={handleResetProgress}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Reset All Scores & Stamps
                    </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
