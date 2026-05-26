import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  getStudent,
  getSignaturesForStudent,
  getStudentClaimedRewards,
  getPlannerItems,
  getEngagementDataForStudent,
  calculateStats,
  calculateStudentAchievements,
  updateStudentAvatarConfig,
} from '../services/dataService';
import { AvatarEditor } from './AvatarEditor';
import type { ClaimedReward, PlannerItem, Signature } from '../types';

interface Props {
  studentId: string;
}

export const AvatarSettingsSection: React.FC<Props> = ({ studentId }) => {
  const student = getStudent(studentId);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [engagementStats, setEngagementStats] = useState({
    intentionCount: 0,
    reflectionCount: 0,
    totalReflectionWords: 0,
    coreValuesReflected: 0,
    goalCheckInCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [sigs, claimed, planner, engagement] = await Promise.all([
        getSignaturesForStudent(studentId),
        getStudentClaimedRewards(studentId),
        getPlannerItems(studentId),
        getEngagementDataForStudent(studentId),
      ]);
      if (!cancelled) {
        setSignatures(sigs);
        setClaimedRewards(claimed);
        setPlannerItems(planner);
        setEngagementStats(engagement.stats);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (!student) return null;

  const stats = calculateStats(signatures);
  const achievements = calculateStudentAchievements(
    signatures,
    claimedRewards.map((c) => c.achievementId),
    plannerItems,
    [],
    engagementStats
  );

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-emerald-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Avatar</h2>
          <p className="text-sm text-gray-500">How you appear on your passport</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Open Avatar Studio to randomize your look or fine-tune details.{' '}
        <strong>Randomize</strong> unlocks after your first stamp. Full customization unlocks when you complete{' '}
        <strong>all Beginner</strong> achievements.
      </p>

      {loading ? (
        <div className="flex justify-center py-10 text-emerald-800">
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      ) : (
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
      )}

      <AvatarEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        student={student}
        achievements={achievements}
        totalStamps={stats.total}
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
