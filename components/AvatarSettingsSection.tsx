import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  getStudent,
  getStudentProfile,
  getSignaturesForStudent,
  calculateStats,
  updateStudentAvatarConfig,
  isStaffParticipantGrade,
} from '../services/dataService';
import { AvatarEditor } from './AvatarEditor';
import type { Signature, Student } from '../types';

interface Props {
  studentId: string;
}

export const AvatarSettingsSection: React.FC<Props> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(() => getStudent(studentId) ?? null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      let profile = getStudent(studentId) ?? null;
      if (!profile) {
        profile = await getStudentProfile(studentId);
      }

      const sigs = await getSignaturesForStudent(studentId);

      if (!cancelled) {
        setStudent(profile);
        setSignatures(sigs);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 flex justify-center py-10 text-emerald-800">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!student) return null;

  const isStaffProfile = isStaffParticipantGrade(student.grade);
  const stats = calculateStats(signatures);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-emerald-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Avatar</h2>
          <p className="text-sm text-gray-500">
            {isStaffProfile
              ? 'How you appear on quiz and typing leaderboards'
              : 'How you appear on your passport'}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {isStaffProfile ? (
          <>
            Open Avatar Studio to randomize your look or fine-tune details. Staff profiles have full
            customization available straight away.
          </>
        ) : (
          <>
            Open Avatar Studio to randomize your look or fine-tune details.{' '}
            <strong>Randomize</strong> unlocks after your first stamp. Full customization unlocks after{' '}
            <strong>5 stamps</strong>.
          </>
        )}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <img
          src={student.avatar}
          alt={`${student.name} avatar`}
          className="w-24 h-24 rounded-full border-4 border-emerald-100 shadow-md bg-white shrink-0 mx-auto sm:mx-0"
        />
        <div className="flex-1 text-center sm:text-left">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Sparkles size={18} />
            Customize avatar
          </button>
        </div>
      </div>

      <AvatarEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        student={student}
        totalStamps={stats.total}
        forceFullCustomization={isStaffProfile}
        onSave={async (config) => {
          const success = await updateStudentAvatarConfig(studentId, config);
          if (success) {
            window.location.reload();
          }
          return success;
        }}
      />
    </div>
  );
};
