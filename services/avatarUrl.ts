import { Student } from '../types';

const DICEBEAR_AVATARS = 'https://api.dicebear.com/7.x/avataaars/svg';

/** UI config key → DiceBear 7.x HTTP query parameter name */
const CONFIG_KEY_TO_API_PARAM: Record<string, string> = {
  clothingColor: 'clothesColor',
};

/** Legacy / UI option values → DiceBear 7.x avataaars schema values */
const OPTION_VALUE_ALIASES: Record<string, Record<string, string>> = {
  top: {
    longHair: 'shortCurly',
    shortHair: 'shortFlat',
    eyepatch: 'hat',
    winterHat01: 'winterHat1',
    straightStrand: 'straightAndStrand',
  },
  eyes: {
    close: 'closed',
    dizzy: 'xDizzy',
  },
};

/** Named hair colors in the editor → hex (DiceBear 7 `hairColor` param) */
const HAIR_COLOR_HEX: Record<string, string> = {
  aurora: 'f59797',
  black: '2c1b18',
  blonde: 'd6b370',
  brown: 'a55728',
  brownDark: '4a312c',
  pastelPink: 'f59797',
  platinum: 'ecdcbf',
  red: 'c93305',
  silverGray: 'e8e1e1',
};

/** Named skin tones in the editor → hex (`skinColor` param) */
const SKIN_COLOR_HEX: Record<string, string> = {
  tanned: 'fd9841',
  yellow: 'f8d25c',
  pale: 'ffdbb4',
  light: 'edb98a',
  brown: 'd08b5b',
  darkBrown: 'ae5d29',
  black: '614335',
};

/** Named clothing colors in the editor → hex (`clothesColor` param) */
const CLOTHING_COLOR_HEX: Record<string, string> = {
  black: '262e33',
  blue01: '5199e4',
  blue02: '25557c',
  blue03: '65c9ff',
  gray01: 'e6e6e6',
  gray02: '929598',
  heather: '3c4f5c',
  pastelBlue: 'b1e2ff',
  pastelGreen: 'a7ffc4',
  pastelOrange: 'ffdeb5',
  pastelRed: 'ffafb9',
  pastelYellow: 'ffffb1',
  pink: 'ff488e',
  red: 'ff5c5c',
  white: 'ffffff',
};

function resolveOptionValue(configKey: string, value: string): string {
  const alias = OPTION_VALUE_ALIASES[configKey]?.[value];
  if (alias) return alias;

  if (configKey === 'hairColor' || configKey === 'facialHairColor') {
    return HAIR_COLOR_HEX[value] ?? value;
  }
  if (configKey === 'skinColor') {
    return SKIN_COLOR_HEX[value] ?? value;
  }
  if (configKey === 'clothingColor') {
    return CLOTHING_COLOR_HEX[value] ?? value;
  }
  return value;
}

function resolveApiParam(configKey: string): string {
  return CONFIG_KEY_TO_API_PARAM[configKey] ?? configKey;
}

/** Build a DiceBear avataaars URL from stored editor config (UI keys/labels are mapped for the API). */
export function buildAvatarUrlFromConfig(
  config: Record<string, string | undefined>
): string {
  const seed = encodeURIComponent(String(config.seed ?? 'default'));
  let url = `${DICEBEAR_AVATARS}?seed=${seed}`;

  if (config.backgroundColor) {
    url += `&backgroundColor=${config.backgroundColor.replace('#', '')}`;
  }

  const isBald = config.top === 'bald';

  for (const [key, value] of Object.entries(config)) {
    if (key === 'seed' || key === 'backgroundColor' || !value) continue;
    if (key === 'top' && isBald) continue;
    if (key === 'facialHairColor' && !config.facialHair) continue;
    const apiKey = resolveApiParam(key);
    const apiValue = resolveOptionValue(key, value);
    url += `&${apiKey}=${encodeURIComponent(apiValue)}`;
  }

  if (isBald) {
    url += '&topProbability=0';
  }

  // DiceBear defaults to 10% chance; force selected accessories / facial hair to render
  if (config.accessories) {
    url += '&accessoriesProbability=100';
  }
  if (config.facialHair) {
    url += '&facialHairProbability=100';
  }

  return url;
}

/** Consistent with `constants` seed helper: collapse whitespace for the pixel avatar seed. */
export function defaultAvatarUrlForName(name: string): string {
  const seed = encodeURIComponent((name || 'Student').replace(/\s+/g, ''));
  return `${DICEBEAR_AVATARS}?seed=${seed}&backgroundColor=b6e3f4`;
}

/**
 * Returns the stored `avatar` when it is a plausible absolute `http(s)` URL; otherwise a
 * DiceBear URL derived from the student’s name (so missing/invalid Firestore `avatar` still renders).
 * When `avatarConfig` is present, rebuilds from config so API param names stay correct.
 */
export function resolveStudentAvatarUrl(
  student: Pick<Student, 'name' | 'avatar' | 'avatarConfig'>
): string {
  if (student.avatarConfig?.seed) {
    return buildAvatarUrlFromConfig(
      student.avatarConfig as Record<string, string | undefined>
    );
  }
  const raw = student.avatar?.trim();
  if (
    raw &&
    raw.length > 8 &&
    /^https?:\/\//i.test(raw) &&
    !/^https?:undefined$/i.test(raw)
  ) {
    return raw;
  }
  return defaultAvatarUrlForName(student.name);
}
