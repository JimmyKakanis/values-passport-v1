import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Student } from '../types';
import {
  buildParentImportPreview,
  parseDelimitedTextToRows,
  parseXlsxToRows,
  ParentImportPreview,
} from '../utils/studentParentImport';
import { bulkUpdateStudentParentContacts } from '../services/dataService';

interface ParentContactImportModalProps {
  isOpen: boolean;
  students: Student[];
  onClose: () => void;
  onImportComplete: (updatedCount: number) => void;
}

export const ParentContactImportModal: React.FC<ParentContactImportModalProps> = ({
  isOpen,
  students,
  onClose,
  onImportComplete,
}) => {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ParentImportPreview | null>(null);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetModal = () => {
    setFileName('');
    setPreview(null);
    setParseError('');
    setSaving(false);
    setShowUnmatched(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setPreview(null);

    try {
      const lower = file.name.toLowerCase();
      let rows: string[][];
      if (lower.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        rows = await parseXlsxToRows(buffer);
      } else if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
        const text = await file.text();
        rows = parseDelimitedTextToRows(text);
      } else {
        throw new Error('Please upload an Excel (.xlsx) or CSV (.csv) file.');
      }

      const result = buildParentImportPreview(rows, students);
      setPreview(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to read spreadsheet file.');
    }
  };

  const pendingUpdates = preview
    ? preview.matched.filter((m) => !m.unchanged)
    : [];

  const handleApplyImport = async () => {
    if (!preview || pendingUpdates.length === 0) return;

    setSaving(true);
    setParseError('');
    const result = await bulkUpdateStudentParentContacts(
      pendingUpdates.map((item) => ({
        id: item.studentId,
        parentEmail: item.parentEmail,
        parentName: item.parentName || undefined,
      }))
    );
    setSaving(false);

    if (result.success) {
      const count = result.updatedCount;
      resetModal();
      onImportComplete(count);
    } else {
      setParseError(result.error || 'Failed to save parent contacts.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="text-emerald-700" size={22} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Import Parent Contacts from Excel</h3>
              <p className="text-xs text-gray-500">
                Matches <code className="bg-gray-100 px-1 rounded">STUDENT_EMAIL</code> and imports{' '}
                <code className="bg-gray-100 px-1 rounded">EMAIL1</code> (Parent Email) &amp;{' '}
                <code className="bg-gray-100 px-1 rounded">TITLE</code> (Parent Name). Extra columns are ignored.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Upload Picker */}
          <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-emerald-950">
                {fileName ? `Selected: ${fileName}` : 'Choose your school roll export (.xlsx or .csv)'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Weekly parent digest remains <strong>off</strong> by default — only contact details are updated.
              </p>
            </div>
            <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2 shrink-0">
              <Upload size={16} />
              {fileName ? 'Choose Different File' : 'Select .xlsx / .csv File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {parseError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Summary pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-800 uppercase font-semibold">Matched to Update</p>
                  <p className="text-2xl font-bold text-emerald-900">{pendingUpdates.length}</p>
                  <p className="text-xs text-emerald-700">
                    {preview.matched.length - pendingUpdates.length > 0
                      ? `${preview.matched.length - pendingUpdates.length} already up to date`
                      : `Out of ${preview.matched.length} matched students`}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Detected Columns</p>
                  <p className="text-xs font-medium text-gray-800 mt-1">
                    Student: <span className="font-bold">{preview.detectedColumns.studentEmailHeader}</span>
                  </p>
                  <p className="text-xs font-medium text-gray-800">
                    Parent: <span className="font-bold">{preview.detectedColumns.parentEmailHeader}</span>
                    {preview.detectedColumns.parentNameHeader
                      ? ` + ${preview.detectedColumns.parentNameHeader}`
                      : ''}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800 uppercase font-semibold">Skipped / Unmatched</p>
                  <p className="text-2xl font-bold text-amber-900">{preview.unmatched.length}</p>
                  {preview.unmatched.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowUnmatched((v) => !v)}
                      className="text-xs text-amber-800 underline font-semibold"
                    >
                      {showUnmatched ? 'Hide skipped rows' : 'View skipped rows'}
                    </button>
                  )}
                </div>
              </div>

              {/* Unmatched details */}
              {showUnmatched && preview.unmatched.length > 0 && (
                <div className="border border-amber-200 rounded-lg bg-amber-50/50 p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                  <p className="font-bold text-amber-900 mb-1">
                    Skipped rows from spreadsheet (not modified):
                  </p>
                  {preview.unmatched.map((u) => (
                    <div key={u.rowNumber} className="text-amber-900 flex justify-between gap-2 border-b border-amber-100 py-1">
                      <span>
                        Row {u.rowNumber}: <strong>{u.studentEmail}</strong> ({u.parentName || 'no name'} / {u.parentEmail})
                      </span>
                      <span className="text-amber-700 shrink-0">{u.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matched table preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Matched Students Preview ({preview.matched.length})
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase border-b">
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">Student Email</th>
                        <th className="p-2.5">Parent Name (TITLE)</th>
                        <th className="p-2.5">Parent Email (EMAIL1)</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.matched.map((item) => (
                        <tr key={item.studentId} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="p-2.5 font-medium text-gray-900">
                            {item.studentName}{' '}
                            <span className="text-xs text-gray-500">({item.grade})</span>
                          </td>
                          <td className="p-2.5 text-gray-600 text-xs">{item.studentEmail}</td>
                          <td className="p-2.5 text-gray-800">{item.parentName || '—'}</td>
                          <td className="p-2.5 text-emerald-800 font-medium">{item.parentEmail}</td>
                          <td className="p-2.5 text-xs">
                            {item.unchanged ? (
                              <span className="text-gray-400">Unchanged</span>
                            ) : item.previousParentEmail ? (
                              <span className="text-amber-700 font-semibold" title={`Was: ${item.previousParentEmail}`}>
                                Update
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 size={13} /> New
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {preview.matched.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">
                            No matching student emails found in Values Passport.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!preview || pendingUpdates.length === 0 || saving}
            onClick={() => void handleApplyImport()}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>Save Parent Contacts ({pendingUpdates.length})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
