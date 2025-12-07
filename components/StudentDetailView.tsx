import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Achievements } from './Achievements';
import { StudentPassport } from './StudentPassport';
import { getStudent } from '../services/dataService';
import { Student } from '../types';
import { Trophy, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';

export const StudentDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'achievements' | 'passport'>('achievements');

  useEffect(() => {
    if (id) {
      const studentData = getStudent(id);
      setStudent(studentData || null);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>;
  }

  if (!student) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-bold text-red-600">Student not found</h2>
        <Link to="/leaderboard" className="text-emerald-600 hover:underline mt-4 inline-block">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <img src={student.avatar} alt={student.name} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-gray-500">{student.grade}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-3 font-bold flex items-center gap-2 transition-all ${
              activeTab === 'achievements'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Achievements
          </button>
          <button
            onClick={() => setActiveTab('passport')}
            className={`px-4 py-3 font-bold flex items-center gap-2 transition-all ${
              activeTab === 'passport'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Values Passport
          </button>
        </div>
        <Link 
            to="/leaderboard" 
            className="text-sm font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
        >
            <ArrowLeft size={16} />
            Back to Leaderboard
        </Link>
      </div>

      <div>
        {id && activeTab === 'achievements' && <Achievements studentId={id} isTeacherView={true} />}
        {id && activeTab === 'passport' && <StudentPassport studentId={id} />}
      </div>
    </div>
  );
};
