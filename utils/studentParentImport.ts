import { Student } from '../types';

export interface ParsedParentRow {
  rowNumber: number;
  studentEmail: string;
  parentEmail: string;
  parentName: string;
}

export interface MatchedParentImportItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  grade: string;
  parentEmail: string;
  parentName: string;
  previousParentEmail?: string;
  previousParentName?: string;
  unchanged: boolean;
}

export interface UnmatchedParentImportRow {
  rowNumber: number;
  studentEmail: string;
  parentEmail: string;
  parentName: string;
  reason: string;
}

export interface ParentImportPreview {
  totalRows: number;
  matched: MatchedParentImportItem[];
  unmatched: UnmatchedParentImportRow[];
  detectedColumns: {
    studentEmailHeader: string;
    parentEmailHeader: string;
    parentNameHeader: string | null;
  };
}

function normalizeHeader(value: string): string {
  return value.trim().toUpperCase().replace(/[\s_-]+/g, '_');
}

function colLettersToIndex(cellRef: string): number {
  const match = cellRef.match(/^[A-Za-z]+/);
  if (!match) return -1;
  const letters = match[0].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  void writer.write(new Uint8Array(compressed));
  void writer.close();
  const response = new Response(ds.readable);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Extracts text files from a standard ZIP archive (.xlsx) using the Central Directory.
 */
async function extractXlsxXmlFiles(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid .xlsx file (ZIP central directory not found).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder('utf-8');
  const files = new Map<string, string>();

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (!fileName.endsWith('.xml')) continue;

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    let rawBytes: Uint8Array;
    if (compressionMethod === 0) {
      rawBytes = compressedSlice;
    } else if (compressionMethod === 8) {
      rawBytes = await inflateRaw(compressedSlice);
    } else {
      continue;
    }
    files.set(fileName, decoder.decode(rawBytes));
  }

  return files;
}

/**
 * Parses the first worksheet of an .xlsx file into a 2D array of string cells.
 */
export async function parseXlsxToRows(buffer: ArrayBuffer): Promise<string[][]> {
  const xmlFiles = await extractXlsxXmlFiles(buffer);
  const parser = new DOMParser();

  // 1. Parse sharedStrings.xml if present
  const sharedStrings: string[] = [];
  const sharedXml = xmlFiles.get('xl/sharedStrings.xml');
  if (sharedXml) {
    const doc = parser.parseFromString(sharedXml, 'application/xml');
    const siNodes = Array.from(doc.getElementsByTagName('si'));
    for (const si of siNodes) {
      const tNodes = Array.from(si.getElementsByTagName('t'));
      sharedStrings.push(tNodes.map((t) => t.textContent ?? '').join(''));
    }
  }

  // 2. Find first worksheet XML
  const sheetXml =
    xmlFiles.get('xl/worksheets/sheet1.xml') ??
    Array.from(xmlFiles.entries()).find(([name]) => name.startsWith('xl/worksheets/'))?.[1];

  if (!sheetXml) {
    throw new Error('No worksheet found in the Excel file.');
  }

  const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
  const rowNodes = Array.from(sheetDoc.getElementsByTagName('row'));
  const rows: string[][] = [];

  for (const rowNode of rowNodes) {
    const cellNodes = Array.from(rowNode.getElementsByTagName('c'));
    const rowCells: string[] = [];
    let nextColIndex = 0;

    for (const cell of cellNodes) {
      const ref = cell.getAttribute('r') ?? '';
      const colIdx = ref ? colLettersToIndex(ref) : nextColIndex;
      const targetIdx = colIdx >= 0 ? colIdx : nextColIndex;

      while (rowCells.length <= targetIdx) {
        rowCells.push('');
      }

      const cellType = cell.getAttribute('t');
      let value = '';
      if (cellType === 'inlineStr') {
        const tNodes = Array.from(cell.getElementsByTagName('t'));
        value = tNodes.map((t) => t.textContent ?? '').join('');
      } else {
        const vNode = cell.getElementsByTagName('v')[0];
        const rawVal = vNode?.textContent ?? '';
        if (cellType === 's') {
          const strIdx = parseInt(rawVal, 10);
          value = !Number.isNaN(strIdx) ? (sharedStrings[strIdx] ?? '') : '';
        } else {
          value = rawVal;
        }
      }

      rowCells[targetIdx] = value.trim();
      nextColIndex = targetIdx + 1;
    }

    if (rowCells.some((c) => c !== '')) {
      rows.push(rowCells);
    }
  }

  return rows;
}

/**
 * Parses CSV or TSV text into a 2D array of string cells.
 */
export function parseDelimitedTextToRows(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length === 0) return [];

  const delimiter = nonEmptyLines[0].includes('\t') ? '\t' : ',';
  return nonEmptyLines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

/**
 * Matches spreadsheet rows against existing students using STUDENT_EMAIL, EMAIL1, and TITLE.
 */
export function buildParentImportPreview(
  rows: string[][],
  roster: Student[]
): ParentImportPreview {
  if (rows.length < 2) {
    throw new Error('The file must contain a header row and at least one student row.');
  }

  const headerRow = rows[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const studentEmailIdx = normalizedHeaders.findIndex((h) =>
    ['STUDENT_EMAIL', 'STUDENTEMAIL', 'EMAIL_ADDRESS', 'EMAIL'].includes(h)
  );
  const parentEmailIdx = normalizedHeaders.findIndex((h) =>
    ['EMAIL1', 'EMAIL_1', 'PARENT_EMAIL', 'PARENTEMAIL', 'GUARDIAN_EMAIL'].includes(h)
  );
  const parentNameIdx = normalizedHeaders.findIndex((h) =>
    ['TITLE', 'PARENT_NAME', 'PARENTNAME', 'GUARDIAN_NAME', 'PARENT', 'SALUTATION'].includes(h)
  );

  if (studentEmailIdx === -1) {
    throw new Error(
      `Could not find a "STUDENT_EMAIL" column in headers: ${headerRow.filter(Boolean).join(', ')}`
    );
  }
  if (parentEmailIdx === -1) {
    throw new Error(
      `Could not find an "EMAIL1" (or "PARENT_EMAIL") column in headers: ${headerRow.filter(Boolean).join(', ')}`
    );
  }

  const studentByEmail = new Map<string, Student>();
  for (const s of roster) {
    const key = (s.email || '').trim().toLowerCase();
    if (key && !studentByEmail.has(key)) {
      studentByEmail.set(key, s);
    }
  }

  const matched: MatchedParentImportItem[] = [];
  const unmatched: UnmatchedParentImportRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const studentEmail = (row[studentEmailIdx] ?? '').trim().toLowerCase();
    const parentEmail = (row[parentEmailIdx] ?? '').trim();
    const parentName = parentNameIdx >= 0 ? (row[parentNameIdx] ?? '').trim() : '';

    if (!studentEmail && !parentEmail && !parentName) continue;

    if (!studentEmail) {
      unmatched.push({
        rowNumber: i + 1,
        studentEmail: '(blank)',
        parentEmail,
        parentName,
        reason: 'Missing STUDENT_EMAIL',
      });
      continue;
    }

    if (!parentEmail) {
      unmatched.push({
        rowNumber: i + 1,
        studentEmail,
        parentEmail: '(blank)',
        parentName,
        reason: 'Missing EMAIL1 (parent email)',
      });
      continue;
    }

    const student = studentByEmail.get(studentEmail);
    if (!student) {
      unmatched.push({
        rowNumber: i + 1,
        studentEmail,
        parentEmail,
        parentName,
        reason: 'No matching student email in Values Passport',
      });
      continue;
    }

    const prevEmail = (student.parentEmail ?? '').trim();
    const prevName = (student.parentName ?? '').trim();
    const unchanged =
      prevEmail.toLowerCase() === parentEmail.toLowerCase() &&
      prevName === parentName;

    matched.push({
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      grade: student.grade,
      parentEmail,
      parentName,
      previousParentEmail: prevEmail || undefined,
      previousParentName: prevName || undefined,
      unchanged,
    });
  }

  return {
    totalRows: rows.length - 1,
    matched,
    unmatched,
    detectedColumns: {
      studentEmailHeader: headerRow[studentEmailIdx] || 'STUDENT_EMAIL',
      parentEmailHeader: headerRow[parentEmailIdx] || 'EMAIL1',
      parentNameHeader: parentNameIdx >= 0 ? headerRow[parentNameIdx] || 'TITLE' : null,
    },
  };
}
