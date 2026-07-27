// Teddy Bear

const MODULE_ID = 'campaign-master-tools';
const FLAGS_KEY = 'featureFlags';

export const DEFAULT_FLAGS = {
  editor: true,
  viewer: true,
  buttonsNotes: true,
  buttonsJournal: true,
  templates: true,
  revealMechanic: true,
  emergencyIssue: true,
  publishToJournal: true,
  publishToChat: true,
  autoSave: true,
  autoDraft: true,
  autoCropImages: true,
  gridSnap: true,
  soundsAnimations: true,
  htmlExport: true,
  jsonExport: true,
  dndImport: true,
  autoShowAll: true,
  actionHistory: true,
  personalizedVersions: false,
  selectiveDelivery: false,
  hiddenBlocks: false,
  publicationTimers: false,
};

export const PRESETS = {
  minimal: { ...DEFAULT_FLAGS, editor: false, templates: false, revealMechanic: false, emergencyIssue: false,
    autoDraft: false, actionHistory: false, personalizedVersions: false, selectiveDelivery: false, hiddenBlocks: false, publicationTimers: false },
  gmEditor: { ...DEFAULT_FLAGS, personalizedVersions: true, selectiveDelivery: true, hiddenBlocks: true, publicationTimers: true },
  playerNewspaper: { ...DEFAULT_FLAGS, editor: false, buttonsNotes: false, templates: false, emergencyIssue: false,
    htmlExport: false, jsonExport: false, dndImport: false, personalizedVersions: false, selectiveDelivery: false, hiddenBlocks: false },
  secretArchive: { ...DEFAULT_FLAGS, revealMechanic: false, emergencyIssue: false, dndImport: false },
  madnessMode: { ...DEFAULT_FLAGS, personalizedVersions: true, selectiveDelivery: true, hiddenBlocks: true, revealMechanic: true },
};

export function registerFeatureFlags() {
  game.settings.register(MODULE_ID, FLAGS_KEY, {
    name: 'Переключатели функций',
    scope: 'world', config: false, type: Object,
    default: { ...DEFAULT_FLAGS },
  });
}

export function getFlags() {
  try {
    const stored = game.settings.get(MODULE_ID, FLAGS_KEY) || {};
    return { ...DEFAULT_FLAGS, ...stored };
  } catch { return { ...DEFAULT_FLAGS }; }
}

export function isFeatureEnabled(key) {
  if (!(key in DEFAULT_FLAGS)) { console.warn('[CMT] Неизвестный feature-flag:', key); return true; }
  return getFlags()[key] !== false;
}

export async function setFlags(patch) {
  const merged = { ...getFlags(), ...patch };
  await game.settings.set(MODULE_ID, FLAGS_KEY, merged);
  return merged;
}

export async function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Неизвестный пресет: ${name}`);
  await game.settings.set(MODULE_ID, FLAGS_KEY, { ...preset });
  return preset;
}
