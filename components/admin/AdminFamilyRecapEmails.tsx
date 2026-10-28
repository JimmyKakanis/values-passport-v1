import React, { useEffect, useMemo, useState } from 'react';
import {
  Filter,
  Loader2,
  Mail,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { SCHOOL_GRADES } from '../../constants';
import { defaultAvatarUrlForName, resolveStudentAvatarUrl } from '../../services/avatarUrl';
import {
  getAllSignatures,
  getSchoolStudents,
  reloadStudentsCacheFromFirestore,
} from '../../services/dataService';
import { Signature, Student } from '../../types';
import {
  buildBulkSignatureIdSet,
  buildStudentRecapSummary,
  getRecapTier,
  RecapTemplateMode,
  RecapTier,
} from '../../utils/familyRecapEmail';
import { FamilyRecapEmailCard } from './FamilyRecapEmailCard';

export const AdminFamilyRecapEmails: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<'ALL' | RecapTier>('ALL');

  // Email generation options
  const [templateMode, setTemplateMode] = useState<RecapTemplateMode>('AUTO');
  const [includeStampCounts, setIncludeStampCounts] = useState(true);
  const [prioritizeIndividualNotes, setPrioritizeIndividualNotes] = useState(true);

  // Selected student id
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await reloadStudentsCacheFromFirestore();
      const [roster, allSigs] = await Promise.all([
        Promise.resolve(getSchoolStudents()),
        getAllSignatures(),
      ]);
      if (!mounted) return;
      setStudents(roster);
      setSignatures(allSigs);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const signaturesByStudent = useMemo(() => {
    const map = new Map<string, Signature[]>();
    for (const sig of signatures) {
      if (!sig.studentId) continue;
      const list = map.get(sig.studentId) ?? [];
      list.push(sig);
      map.set(sig.studentId, list);
    }
    return map;
  }, [signatures]);

  const bulkSignatureIds = useMemo(
    () => buildBulkSignatureIdSet(signatures),
    [signatures]
  );

  const studentRows = useMemo(() => {
    return students
      .map((student) => {
        const sigs = signaturesByStudent.get(student.id) ?? [];
        const notesCount = sigs.filter((s) => Boolean(s.note && s.note.trim())).length;
        const tier = getRecapTier(sigs.length);
        return {
          student,
          sigs,
          totalStamps: sigs.length,
          notesCount,
          tier,
        };
      })
      .sort((a, b) => {
        if (b.totalStamps !== a.totalStamps) return b.totalStamps - a.totalStamps;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [students, signaturesByStudent]);

  // Pick a sensible initial student once loaded
  useEffect(() => {
    if (!selectedStudentId && studentRows.length > 0) {
      const firstWithStamps = studentRows.find((r) => r.totalStamps > 0) ?? studentRows[0];
      setSelectedStudentId(firstWithStamps.student.id);
    }
  }, [studentRows, selectedStudentId]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return studentRows.filter((row) => {
      if (selectedGrade !== 'ALL' && row.student.grade !== selectedGrade) return false;
      if (selectedTier !== 'ALL' && row.tier !== selectedTier) return false;
      if (!q) return true;
      return (
        row.student.name.toLowerCase().includes(q) ||
        (row.student.parentName || '').toLowerCase().includes(q) ||
        (row.student.parentEmail || '').toLowerCase().includes(q)
      );
    });
  }, [studentRows, searchTerm, selectedGrade, selectedTier]);

  // Showcase exemplars for quick committee demonstration
  const showcaseExemplars = useMemo(() => {
    const high =
      studentRows.find((r) => r.student.name.toLowerCase().includes('charlie robinson')) ??
      studentRows.find((r) => r.tier === 'HIGH');
    const moderate =
      studentRows.find((r) => r.student.name.toLowerCase().includes('spencer mepstead')) ??
      studentRows.find((r) => r.tier === 'MODERATE' && r.notesCount >= 5);
    const light =
      studentRows.find((r) => r.student.name.toLowerCase().includes('layla dart')) ??
      studentRows.find((r) => r.tier === 'LIGHT' && r.notesCount >= 3);
    return { high, moderate, light };
  }, [studentRows]);

  const activeRow = useMemo(() => {
    return (
      studentRows.find((r) => r.student.id === selectedStudentId) ??
      filteredRows[0] ??
      studentRows[0]
    );
  }, [studentRows, filteredRows, selectedStudentId]);

  const activeSummary = useMemo(() => {
    if (!activeRow) return null;
    return buildStudentRecapSummary(
      activeRow.student,
      activeRow.sigs,
      bulkSignatureIds,
      {
        templateMode,
        includeStampCounts,
        prioritizeIndividualNotes,
      }
    );
  }, [
    activeRow,
    bulkSignatureIds,
    templateMode,
    includeStampCounts,
    prioritizeIndividualNotes,
  ]);

  const selectShowcaseStudent = (row?: (typeof studentRows)[number]) => {
    if (!row) return;
    setSelectedGrade('ALL');
    setSelectedTier('ALL');
    setSearchTerm('');
    setSelectedStudentId(row.student.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-emerald-800">
        <Loader2 className="animate-spin h-7 w-7 mr-2" />
        Loading student passports and teacher comments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Committee Showcase Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="text-emerald-700" size={22} />
            Family Year-in-Review Email Generator
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Preview, customize, and copy styled year-end Values Passport recap emails with real student stamps and teacher comments.
          </p>
        </div>

        {/* One-Click Tier Showcase Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 mr-1">
            <Sparkles size={14} className="text-emerald-700" /> Sample Tiers:
          </span>
          {showcaseExemplars.high && (
            <button
              type="button"
              onClick={() => selectShowcaseStudent(showcaseExemplars.high)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                activeRow?.student.id === showcaseExemplars.high.student.id
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Tier 1: {showcaseExemplars.high.student.name.split(' ')[0]} ({showcaseExemplars.high.totalStamps})
            </button>
          )}
          {showcaseExemplars.moderate && (
            <button
              type="button"
              onClick={() => selectShowcaseStudent(showcaseExemplars.moderate)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                activeRow?.student.id === showcaseExemplars.moderate.student.id
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
              }`}
            >
              Tier 2: {showcaseExemplars.moderate.student.name.split(' ')[0]} ({showcaseExemplars.moderate.totalStamps})
            </button>
          )}
          {showcaseExemplars.light && (
            <button
              type="button"
              onClick={() => selectShowcaseStudent(showcaseExemplars.light)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                activeRow?.student.id === showcaseExemplars.light.student.id
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
              }`}
            >
              Tier 3: {showcaseExemplars.light.student.name.split(' ')[0]} ({showcaseExemplars.light.totalStamps})
            </button>
          )}
        </div>
      </div>

      {/* Template Settings Bar */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-emerald-700" />
            Template Style:
          </span>
          <select
            value={templateMode}
            onChange={(e) => setTemplateMode(e.target.value as RecapTemplateMode)}
            className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="AUTO">Auto-Select by Student Stamp Tier (Recommended)</option>
            <option value="HIGH">Force Tier 1 (High Engagement Copy)</option>
            <option value="MODERATE">Force Tier 2 (Moderate Progress Copy)</option>
            <option value="LIGHT">Force Tier 3 (Gentle / Quality-Focused Copy)</option>
            <option value="UNIVERSAL">Single Universal Template (All Students)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-700">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeStampCounts}
              onChange={(e) => setIncludeStampCounts(e.target.checked)}
              className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4"
            />
            Show stamp counts (Tier 1 &amp; 2)
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prioritizeIndividualNotes}
              onChange={(e) => setPrioritizeIndividualNotes(e.target.checked)}
              className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4"
            />
            Prioritize personal notes over whole-class bulk stamps
          </label>
        </div>
      </div>

      {/* Main Split Layout: Student Picker (Left) + Styled Email Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roster Filter & Picker */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 space-y-2.5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search student or parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <Filter size={13} className="text-gray-400 shrink-0" />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-medium text-gray-700"
                >
                  <option value="ALL">All Years</option>
                  {SCHOOL_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as 'ALL' | RecapTier)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-medium text-gray-700"
              >
                <option value="ALL">All Tiers ({studentRows.length})</option>
                <option value="HIGH">Tier 1: 25+ Stamps</option>
                <option value="MODERATE">Tier 2: 8–24 Stamps</option>
                <option value="LIGHT">Tier 3: 1–7 Stamps</option>
                <option value="NONE">0 Stamps</option>
              </select>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Users size={12} /> Students ({filteredRows.length})
            </span>
            <span>Stamps / Notes</span>
          </div>

          <ul className="divide-y divide-gray-100 max-h-[38rem] overflow-y-auto">
            {filteredRows.map((row) => {
              const isSelected = activeRow?.student.id === row.student.id;
              const tierDot =
                row.tier === 'HIGH'
                  ? 'bg-emerald-500'
                  : row.tier === 'MODERATE'
                    ? 'bg-blue-500'
                    : row.tier === 'LIGHT'
                      ? 'bg-amber-500'
                      : 'bg-gray-300';
              return (
                <li key={row.student.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(row.student.id)}
                    className={`w-full text-left px-3.5 py-3 flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/90 border-l-4 border-emerald-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={resolveStudentAvatarUrl(row.student)}
                        alt={row.student.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultAvatarUrlForName(row.student.name);
                        }}
                        className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 shrink-0 object-cover"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${tierDot}`} />
                          {row.student.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {row.student.grade}
                          {row.student.parentName ? ` • ${row.student.parentName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block text-xs font-extrabold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        {row.totalStamps}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {row.notesCount} note{row.notesCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Column: Generated Email Preview */}
        <div className="lg:col-span-8">
          {activeSummary ? (
            <FamilyRecapEmailCard
              summary={activeSummary}
              includeStampCounts={includeStampCounts}
            />
          ) : (
            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              Select a student to preview their generated family recap email.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
