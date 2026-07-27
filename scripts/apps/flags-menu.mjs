// Teddy Bear

import { DEFAULT_FLAGS, PRESETS, getFlags, setFlags, applyPreset } from '../feature-flags.mjs';

const { DialogV2 } = foundry.applications.api;

const BLOCKS = [
  { title: 'Общее', keys: ['editor','viewer'] },
  { title: 'Интерфейс', keys: ['buttonsNotes','buttonsJournal','templates','gridSnap','soundsAnimations'] },
  { title: 'Публикация и доставка', keys: ['publishToJournal','publishToChat','emergencyIssue','revealMechanic','autoShowAll'] },
  { title: 'Игроки и аудитории', keys: ['personalizedVersions','selectiveDelivery','hiddenBlocks','publicationTimers'] },
  { title: 'Производительность', keys: ['autoSave','autoDraft','autoCropImages'] },
  { title: 'Безопасность/ограничения', keys: ['htmlExport','jsonExport','dndImport','actionHistory'] },
];

const FLAG_LABELS = {
  editor:'Редактор', viewer:'Просмотрщик', buttonsNotes:'Кнопки в Notes', buttonsJournal:'Кнопки в Journal',
  templates:'Галерея шаблонов', gridSnap:'Сетка и привязка', soundsAnimations:'Звуки/анимации',
  publishToJournal:'Публикация в Журнал', publishToChat:'Публикация в чат', emergencyIssue:'Экстренный выпуск',
  revealMechanic:'Механика раскрытия', autoShowAll:'Показ всем игрокам', personalizedVersions:'Персональные версии',
  selectiveDelivery:'Избирательная доставка', hiddenBlocks:'Скрытые блоки', publicationTimers:'Таймеры публикации',
  autoSave:'Автосохранение', autoDraft:'Авто-черновик', autoCropImages:'Авто-обрезка изображений',
  htmlExport:'Экспорт HTML', jsonExport:'Экспорт JSON', dndImport:'Перетаскивание объектов', actionHistory:'История действий (Undo/Redo)',
};

const PRESET_LABELS = {
  minimal: 'Minimal — только просмотр и публикация',
  gmEditor: 'GM Editor — всё включено',
  playerNewspaper: 'Player Newspaper — только просмотрщик и чат',
  secretArchive: 'Secret Archive — без reveal и экстренных выпусков',
  madnessMode: 'Madness Mode — персонализация и искажения включены',
};

export async function openFlagsMenu() {
  const current = getFlags();

  const blockHTML = BLOCKS.map(b => `
    <fieldset style="border:1px solid #333;border-radius:4px;margin-bottom:8px;padding:6px 10px;">
      <legend style="font-size:.78rem;color:#c9a84c;padding:0 4px;">${b.title}</legend>
      ${b.keys.map(k => `
        <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:#ddd;padding:2px 0;">
          <input type="checkbox" class="cmt-flag-cb" data-key="${k}" ${current[k]!==false?'checked':''}>
          ${FLAG_LABELS[k] || k}
        </label>`).join('')}
    </fieldset>`).join('');

  const presetHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${Object.keys(PRESETS).map(id => `<button type="button" class="cmt-preset-btn" data-preset="${id}" style="flex:1;min-width:140px;padding:5px 8px;background:#1a1a2a;border:1px solid #445;color:#ccd;border-radius:4px;cursor:pointer;font-size:.72rem;">${PRESET_LABELS[id]||id}</button>`).join('')}
    </div>`;

  const dlg = new DialogV2({
    window: { title: 'Campaign Master Tools — настройки функций', icon: 'fas fa-sliders-h' },
    content: `
      <p style="font-size:.72rem;color:#888;margin:0 0 8px;">Выберите готовый пресет кампании или настройте переключатели вручную.</p>
      ${presetHTML}
      <div style="max-height:420px;overflow:auto;">${blockHTML}</div>
    `,
    buttons: [
      { action:'save', label:'Сохранить', icon:'fas fa-save', default:true,
        callback: async (ev,btn,dialog) => {
          const root = dialog.element;
          const patch = {};
          root?.querySelectorAll('.cmt-flag-cb').forEach(cb => { patch[cb.dataset.key] = cb.checked; });
          await setFlags(patch);
          ui.notifications.info('Настройки функций сохранены.');
        } },
      { action:'cancel', label:'Отмена', icon:'fas fa-times' },
    ],
  });

  dlg.addEventListener('render', () => {
    const root = dlg.element; if(!root) return;
    root.querySelectorAll('.cmt-preset-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const preset = await applyPreset(btn.dataset.preset);
        root.querySelectorAll('.cmt-flag-cb').forEach(cb => { cb.checked = preset[cb.dataset.key] !== false; });
        ui.notifications.info(`Применён пресет: ${PRESET_LABELS[btn.dataset.preset]}`);
      });
    });
  });

  dlg.render(true);
}

export class FlagsMenuApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { id: 'cmt-flags-menu', window: { title: 'Campaign Master Tools' } };
  render() { openFlagsMenu(); return this; }
}
