import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Lock, Save, Wand2 } from 'lucide-react';
import { Student } from '../types';
import { buildAvatarUrlFromConfig } from '../services/avatarUrl';

const FULL_CUSTOMIZATION_STAMP_THRESHOLD = 5;

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  /** Total stamps earned; Randomize unlocks at >= 1, full customization at >= 5 */
  totalStamps: number;
  onSave: (config: any) => Promise<boolean>;
}

// DiceBear 7.x avataaars schema values (see api.dicebear.com/7.x/avataaars/schema.json)
const AVATAR_OPTIONS = {
  top: [
    'bald',
    'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'dreads01', 'dreads02',
    'frida', 'fro', 'froBand', 'frizzle', 'hat', 'hijab', 'longButNotTooLong',
    'miaWallace', 'shaggy', 'shaggyMullet', 'shavedSides', 'shortCurly', 'shortFlat',
    'shortRound', 'shortWaved', 'sides', 'straight01', 'straight02', 'straightAndStrand',
    'theCaesar', 'theCaesarAndSidePart', 'turban', 'winterHat1', 'winterHat02',
    'winterHat03', 'winterHat04',
  ],
  accessories: [
    'eyepatch', 'kurt', 'prescription01', 'prescription02', 'round',
    'sunglasses', 'wayfarers',
  ],
  hairColor: [
    'aurora', 'black', 'blonde', 'brown', 'brownDark', 
    'pastelPink', 'platinum', 'red', 'silverGray'
  ],
  facialHair: [
    'beardLight', 'beardMajestic', 'beardMedium', 
    'moustacheFancy', 'moustacheMagnum'
  ],
  facialHairColor: [
    'aurora', 'black', 'blonde', 'brown', 'brownDark',
    'pastelPink', 'platinum', 'red', 'silverGray',
  ],
  clothing: [
    'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 
    'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 
    'shirtScoopNeck', 'shirtVNeck'
  ],
  clothingColor: [
    'black', 'blue01', 'blue02', 'blue03', 'gray01', 'gray02', 
    'heather', 'pastelBlue', 'pastelGreen', 'pastelOrange', 
    'pastelRed', 'pastelYellow', 'pink', 'red', 'white'
  ],
  eyes: [
    'closed', 'cry', 'default', 'xDizzy', 'eyeRoll', 'happy',
    'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky',
  ],
  eyebrows: [
    'angry', 'angryNatural', 'default', 'defaultNatural', 
    'flatNatural', 'frownNatural', 'raisedExcited', 
    'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 
    'unibrowNatural', 'upDown', 'upDownNatural'
  ],
  mouth: [
    'concerned', 'default', 'disbelief', 'eating', 'grimace', 
    'sad', 'screamOpen', 'serious', 'smile', 'tongue', 
    'twinkle', 'vomit'
  ],
  skinColor: [
    'tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'
  ]
};

const BACKGROUND_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'
];

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  totalStamps,
  onSave 
}) => {
  const [config, setConfig] = useState<any>({
    seed: student.avatarConfig?.seed || student.name.replace(/\s+/g, ''),
    backgroundColor: student.avatarConfig?.backgroundColor || 'b6e3f4',
    ...student.avatarConfig
  });
  const [isSaving, setIsSaving] = useState(false);

  const hasFullCustomization = totalStamps >= FULL_CUSTOMIZATION_STAMP_THRESHOLD;
  const stampsUntilFullCustomization = Math.max(
    0,
    FULL_CUSTOMIZATION_STAMP_THRESHOLD - totalStamps
  );

  useEffect(() => {
    if (isOpen) {
        setConfig({
            seed: student.avatarConfig?.seed || student.name.replace(/\s+/g, ''),
            backgroundColor: student.avatarConfig?.backgroundColor || 'b6e3f4',
            ...student.avatarConfig
        });
    }
  }, [isOpen, student]);

  const previewUrl = useMemo(
    () => buildAvatarUrlFromConfig(config),
    [config]
  );

  if (!isOpen) return null;

  const canRandomize = totalStamps >= 1;

  const handleRandomize = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setConfig({ ...config, seed: randomSeed });
  };

  const handleChange = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(config);
    setIsSaving(false);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <div className="fixed inset-0 z-[51] overflow-y-auto pointer-events-none">
        <div className="flex min-h-[100dvh] items-center justify-center p-4">
          <div className="pointer-events-auto bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[min(90dvh,calc(100dvh-2rem))] overflow-hidden flex flex-col md:flex-row min-h-0 my-auto">
        
        {/* Preview Section */}
        <div className="w-full md:w-1/3 min-h-0 md:max-h-full md:overflow-y-auto md:shrink-0 overflow-x-hidden bg-gray-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Avatar Studio</h2>
            <div className="relative w-48 h-48 md:w-64 md:h-64 bg-white rounded-full shadow-lg p-2 mb-6 ring-4 ring-indigo-100">
                <img 
                    src={previewUrl} 
                    alt="Avatar Preview" 
                    className="w-full h-full rounded-full"
                />
            </div>
            
            <div className="flex gap-3 w-full">
                <button
                    onClick={handleRandomize}
                    disabled={!canRandomize}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                        canRandomize 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {canRandomize ? <Wand2 size={20} /> : <Lock size={16} />}
                    Randomize
                </button>
            </div>
            {!canRandomize && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Earn at least 1 stamp to unlock Randomize.
                </p>
            )}
        </div>

        {/* Controls Section — grid keeps middle row scrollable (flex 1fr is flaky in some browsers) */}
        <div className="w-full md:w-2/3 min-h-0 md:self-stretch grid grid-rows-[auto_minmax(0,1fr)_auto] bg-white">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-700">Customization Options</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    <X size={20} />
                </button>
            </div>

            <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
                {!hasFullCustomization && (
                     <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <Lock className="text-amber-500 mt-1 shrink-0" size={20} />
                        <div>
                            <h4 className="font-semibold text-amber-800">Full Customization Locked</h4>
                            <div className="text-sm text-amber-700 mt-1 space-y-2">
                                <p>
                                    Detailed options (colors, hair, clothes, and more) unlock when you have earned <strong>at least {FULL_CUSTOMIZATION_STAMP_THRESHOLD} stamps</strong>
                                    {stampsUntilFullCustomization > 0 && (
                                      <> — <strong>{stampsUntilFullCustomization} more</strong> to go!</>
                                    )}
                                    .
                                </p>
                                <p>
                                    <strong>Randomize</strong> is available as soon as you have earned <strong>at least 1 stamp</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Background Color — unlocked at 5+ stamps */}
                    <div className={`p-4 rounded-lg border ${hasFullCustomization ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Background Color</label>
                        <div className="flex flex-wrap gap-2">
                            {BACKGROUND_COLORS.map(color => (
                                <button
                                    key={color}
                                    disabled={!hasFullCustomization}
                                    onClick={() => handleChange('backgroundColor', color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                                        config.backgroundColor === color ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: `#${color}` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Feature Controls — unlocked at 5+ stamps */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!hasFullCustomization ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {Object.entries(AVATAR_OPTIONS).map(([key, options]) => (
                            <div key={key} className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </label>
                                <select
                                    value={config[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
                                >
                                    <option value="">Default / Random</option>
                                    {options.map(opt => (
                                        <option key={opt} value={opt}>
                                            {opt.replace(/([A-Z])/g, ' $1').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="shrink-0 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border-t border-gray-100 flex flex-wrap justify-end gap-3 bg-gray-50">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Avatar
                </button>
            </div>
        </div>
        </div>
      </div>
      </div>
    </>
  );
};
