// LiveNewspaper — data model
// Teddy Bear

const SETTING_KEY = 'newspaperData';
const ARCHIVE_KEY = 'newspaperArchive';
const DRAFT_KEY   = 'newspaperDraft';

// Page sizes in px at 96dpi
export const PAGE_SIZES = {
  A0: { w: 3179, h: 4494, label: 'A0  (841×1189 мм)' },
  A1: { w: 2245, h: 3179, label: 'A1  (594×841 мм)' },
  A2: { w: 1587, h: 2245, label: 'A2  (420×594 мм)' },
  A3: { w: 1123, h: 1587, label: 'A3  (297×420 мм)' },
  A4: { w:  794, h: 1123, label: 'A4  (210×297 мм)' },
  A5: { w:  559, h:  794, label: 'A5  (148×210 мм)' },
  A6: { w:  397, h:  559, label: 'A6  (105×148 мм)' },
  custom: { w: 794, h: 1123, label: 'Свой размер' },
};

// Дефолтные шаблоны для каждого типа элемента
export const ELEMENT_DEFAULTS = {
  masthead: { type:'masthead', x:0,   y:0,   w:794, h:160, props:{ line1:'The Kingdom', line2:'Times', motto:'\"Все новости, достойные печати\"', style:'classic', textColor:'' } },
  headline: { type:'headline', x:0,   y:180, w:540, h:110, props:{ text:'Заголовок статьи', fontSize:34, fontUnit:'px', textColor:'' } },
  body:     { type:'body',     x:0,   y:310, w:540, h:220, props:{ text:'Текст статьи...', fontSize:13, fontUnit:'px', dropCap:true, columns:1, textColor:'' } },
  image:    { type:'image',    x:0,   y:550, w:540, h:200, props:{ url:'', caption:'', scale:100, borderStyle:'none' } },
  rule:     { type:'rule',     x:0,   y:760, w:794, h:20,  props:{ thickness:2, style:'double', color:'#1a1a1a' } },
  quote:    { type:'quote',    x:560, y:180, w:230, h:160, props:{ text:'Цитата дня', author:'— Автор', textColor:'' } },
  box:      { type:'box',      x:560, y:360, w:230, h:180, props:{ title:'Короткая заметка', text:'Текст заметки...', border:true, textColor:'' } },
  ad:       { type:'ad',       x:560, y:560, w:230, h:120, props:{ title:'Объявление', text:'Текст объявления...', textColor:'' } },
  byline:   { type:'byline',   x:0,   y:300, w:540, h:28,  props:{ text:'Корреспондент: Придворный Репортёр', textColor:'' } },
};

// Создать страницу с дефолтным набором элементов
export function makeDefaultPage(style = 'classic', size = 'A4') {
  const sz = PAGE_SIZES[size] || PAGE_SIZES.A4;
  return {
    id: `page_${Date.now()}`,
    paperStyle: style,
    paperColor: '',
    pageSize: size,
    customW: sz.w,
    customH: sz.h,
    orientation: 'portrait',
    isDraft: false,
    authorUuid: null,
    elements: [
      { id:'el_mast',  ...clone(ELEMENT_DEFAULTS.masthead), w: sz.w },
      { id:'el_rule1', type:'rule', x:0, y:162, w:sz.w, h:16,  props:{ thickness:3, style:'double', color:'#1a1a1a' } },
      { id:'el_head',  ...clone(ELEMENT_DEFAULTS.headline), x:10, y:190, w:Math.round(sz.w*0.68), props:{ text:'', fontSize:34, fontUnit:'px', textColor:'' } },
      { id:'el_body',  ...clone(ELEMENT_DEFAULTS.body),    x:10, y:300, w:Math.round(sz.w*0.68), props:{ text:'', fontSize:13, fontUnit:'px', dropCap:true, columns:2, textColor:'' } },
      { id:'el_img',   ...clone(ELEMENT_DEFAULTS.image),   x:10, y:610, w:Math.round(sz.w*0.68), props:{ url:'', caption:'', scale:100, borderStyle:'none' } },
      { id:'el_q',     ...clone(ELEMENT_DEFAULTS.quote),   x:Math.round(sz.w*0.72), y:190, w:Math.round(sz.w*0.26), props:{ text:'', author:'', textColor:'' } },
      { id:'el_box',   ...clone(ELEMENT_DEFAULTS.box),     x:Math.round(sz.w*0.72), y:345, w:Math.round(sz.w*0.26), props:{ title:'', text:'', border:true, textColor:'' } },
    ],
  };
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

const DEFAULT_DATA    = { pages: [ makeDefaultPage() ], currentPage: 0, updatedAt: null };
const DEFAULT_ARCHIVE = { entries: [] };
const DEFAULT_DRAFT   = { pages: [] };

export class LiveNewspaper {
  static _data    = null;
  static _archive = null;
  static _draft   = null;

  static register() {
    const base = { scope:'world', config:false, type:Object };
    game.settings.register('campaign-master-tools', SETTING_KEY,  { ...base, name:'Данные газеты',  default:DEFAULT_DATA    });
    game.settings.register('campaign-master-tools', ARCHIVE_KEY,  { ...base, name:'Архив газеты',   default:DEFAULT_ARCHIVE });
    game.settings.register('campaign-master-tools', DRAFT_KEY,    { ...base, name:'Черновики',      default:DEFAULT_DRAFT   });
    game.settings.register('campaign-master-tools', 'autoDraft',  { ...base, name:'Автосохранение (слот)', default:null });

    // Права доступа по ролям — i18n не готов на стадии 'init',
    // поэтому передаём ключ локализации, Foundry сам подставит строку при отображении настроек
    const roleChoices = { 1:'Все игроки (Player)', 2:'Доверенные (Trusted)', 3:'Ассистент GM (Assistant)', 4:'Только GM' };
    ['Create','Edit','Publish','View'].forEach(action => {
      game.settings.register('campaign-master-tools', `role${action}`, {
        name: `cmt.settings.role${action}.name`,
        hint: `cmt.settings.role${action}.hint`,
        scope: 'world', config: true, type: Number,
        choices: roleChoices,
        default: action === 'View' ? 1 : 4,
      });
    });

    game.settings.register('campaign-master-tools', 'autoSaveEnabled', {
      name: 'Автосохранение',
      hint: 'Автоматически сохранять текущую страницу во время редактирования.',
      scope: 'client', config: true, type: Boolean, default: true,
    });
  }

  static canDo(action) {
    const required = game.settings.get('campaign-master-tools', `role${action}`);
    return game.user.role >= required;
  }

  static async init() {
    try {
      LiveNewspaper._data    = game.settings.get('campaign-master-tools', SETTING_KEY) || clone(DEFAULT_DATA);
      LiveNewspaper._archive = game.settings.get('campaign-master-tools', ARCHIVE_KEY) || clone(DEFAULT_ARCHIVE);
      LiveNewspaper._draft   = game.settings.get('campaign-master-tools', DRAFT_KEY)   || clone(DEFAULT_DRAFT);
      if (!LiveNewspaper._data.pages) LiveNewspaper._data = clone(DEFAULT_DATA);
      LiveNewspaper._data.pages = LiveNewspaper._data.pages.map(p => p.elements ? _ensurePageDefaults(p) : _migrateLegacyPage(p));
      // Страховка на случай если данные пришли в нестандартном виде
      if (!Array.isArray(LiveNewspaper._archive.entries)) LiveNewspaper._archive = clone(DEFAULT_ARCHIVE);
      if (!Array.isArray(LiveNewspaper._draft.pages))     LiveNewspaper._draft   = clone(DEFAULT_DRAFT);
    } catch(e) {
      console.warn('[CMT] Init error:', e);
      LiveNewspaper._data    = clone(DEFAULT_DATA);
      LiveNewspaper._archive = clone(DEFAULT_ARCHIVE);
      LiveNewspaper._draft   = clone(DEFAULT_DRAFT);
    }
    console.log('[CMT Newspaper] Инициализирован v1.0.5');
  }

  static getData()      { return LiveNewspaper._data    || clone(DEFAULT_DATA); }
  static getArchive()   { return LiveNewspaper._archive || clone(DEFAULT_ARCHIVE); }
  static getDraft()     { return LiveNewspaper._draft   || clone(DEFAULT_DRAFT); }
  static getPage(index) { const d = LiveNewspaper.getData(); return d.pages[index ?? d.currentPage] || d.pages[0]; }

  // --- Page CRUD ---

  static async setPage(index, pageData) {
    const d = LiveNewspaper.getData();
    d.pages[index] = pageData;
    d.updatedAt = new Date().toISOString();
    LiveNewspaper._data = d;
    await LiveNewspaper._save();
  }

  static async addPage(style, size) {
    const d = LiveNewspaper.getData();
    if (d.pages.length >= 20) { ui.notifications.warn('Максимум 20 страниц.'); return false; }
    d.pages.push(makeDefaultPage(style || 'classic', size || 'A4'));
    d.updatedAt = new Date().toISOString();
    LiveNewspaper._data = d;
    await LiveNewspaper._save();
    return true;
  }

  static async removePage(index) {
    const d = LiveNewspaper.getData();
    if (d.pages.length <= 1) { ui.notifications.warn('Нельзя удалить единственную страницу.'); return false; }
    d.pages.splice(index, 1);
    if (d.currentPage >= d.pages.length) d.currentPage = d.pages.length - 1;
    d.updatedAt = new Date().toISOString();
    LiveNewspaper._data = d;
    await LiveNewspaper._save();
    return true;
  }

  // --- Drafts ---

  static async saveDraft(pageIndex, pageData, name = '') {
    const dr = LiveNewspaper.getDraft();
    if (!Array.isArray(dr.pages)) dr.pages = [];
    const entry = {
      id: `draft_${Date.now()}`,
      name: name || `Черновик ${new Date().toLocaleDateString('ru')}`,
      date: new Date().toISOString(),
      pageIndex,
      pageData: clone(pageData),
    };
    dr.pages.unshift(entry);
    if (dr.pages.length > 30) dr.pages.length = 30;
    LiveNewspaper._draft = dr;
    await game.settings.set('campaign-master-tools', DRAFT_KEY, dr);
    return entry;
  }

  static async deleteDraft(id) {
    const dr = LiveNewspaper.getDraft();
    dr.pages = Array.isArray(dr.pages) ? dr.pages.filter(e => e.id !== id) : [];
    LiveNewspaper._draft = dr;
    await game.settings.set('campaign-master-tools', DRAFT_KEY, dr);
  }

  // Авто-черновик — один слот, перезаписывается каждый раз (для кнопки «Восстановить»)
  static async saveAutoDraft(pageIndex, pageData) {
    const entry = {
      id: '__auto__',
      date: new Date().toISOString(),
      pageIndex,
      pageData: clone(pageData),
    };
    await game.settings.set('campaign-master-tools', 'autoDraft', entry);
  }

  static getAutoDraft() {
    try { return game.settings.get('campaign-master-tools', 'autoDraft') || null; }
    catch { return null; }
  }

  // --- Archive ---

  static async archivePage(pageData, name = '') {
    const ar = LiveNewspaper.getArchive();
    if (!Array.isArray(ar.entries)) ar.entries = [];
    const entry = {
      id: `arc_${Date.now()}`,
      name: name || `Выпуск ${new Date().toLocaleDateString('ru')}`,
      date: new Date().toISOString(),
      pageData: clone(pageData),
    };
    ar.entries.unshift(entry);
    if (ar.entries.length > 50) ar.entries.length = 50;
    LiveNewspaper._archive = ar;
    await game.settings.set('campaign-master-tools', ARCHIVE_KEY, ar);
    return entry;
  }

  static async deleteArchive(id) {
    const ar = LiveNewspaper.getArchive();
    ar.entries = Array.isArray(ar.entries) ? ar.entries.filter(e => e.id !== id) : [];
    LiveNewspaper._archive = ar;
    await game.settings.set('campaign-master-tools', ARCHIVE_KEY, ar);
  }

  static async restoreArchive(id) {
    const ar = LiveNewspaper.getArchive();
    if (!Array.isArray(ar.entries)) return false;
    const entry = ar.entries.find(e => e.id === id);
    if (!entry) return false;
    const d = LiveNewspaper.getData();
    d.pages.push(clone(entry.pageData));
    d.updatedAt = new Date().toISOString();
    LiveNewspaper._data = d;
    await LiveNewspaper._save();
    return d.pages.length - 1;
  }

  // --- Export / Import ---

  static exportJSON() {
    const payload = {
      version: '1.0.5',
      exportedAt: new Date().toISOString(),
      data: LiveNewspaper.getData(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `newspaper-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ui.notifications.info('Данные газеты экспортированы!');
  }

  static async importJSON(jsonText) {
    try {
      const payload = JSON.parse(jsonText);
      const data = payload.data || payload; // поддержка прямого data-объекта
      if (!data.pages || !Array.isArray(data.pages)) throw new Error('Неверный формат файла');
      data.pages = data.pages.map(p => p.elements ? _ensurePageDefaults(p) : _migrateLegacyPage(p));
      data.currentPage = Math.min(data.currentPage || 0, data.pages.length - 1);
      LiveNewspaper._data = data;
      await LiveNewspaper._save();
      ui.notifications.info(`Импортировано ${data.pages.length} стр.`);
      return true;
    } catch(e) {
      ui.notifications.error('Ошибка импорта: ' + e.message);
      return false;
    }
  }

  static async _save() {
    await game.settings.set('campaign-master-tools', SETTING_KEY, LiveNewspaper._data);
  }

  static async notifyUpdate() {
    const page  = LiveNewspaper.getPage();
    const mast  = page?.elements?.find(e => e.type === 'masthead');
    const title = mast ? `${mast.props.line1||''} ${mast.props.line2||''}`.trim() : 'The Kingdom Times';
    await ChatMessage.create({
      content: `<div style="font-family:'Georgia',serif;border:1px solid #8b2e2e;padding:12px;background:#fdf8f0;border-radius:4px;">
        <div style="font-weight:bold;font-size:1.1em;color:#8b2e2e;">📰 Газета обновилась!</div>
        <div style="color:#444;margin-top:4px;font-size:0.9em;">Свежий выпуск <em>${title}</em> доступен.</div>
        <button class="cmt-open-newspaper-btn" style="margin-top:10px;padding:5px 14px;background:#8b2e2e;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:inherit;font-size:0.85em;">📖 Открыть газету</button>
      </div>`,
      speaker: { alias: 'Редакция' },
    });
  }
}

// --- Helpers ---

function _ensurePageDefaults(p) {
  p.orientation = p.orientation || 'portrait';
  p.paperColor  = p.paperColor  || '';
  p.pageSize    = p.pageSize    || 'A4';
  p.customW     = p.customW     || 794;
  p.customH     = p.customH     || 1123;
  p.isDraft     = p.isDraft     ?? false;
  // Убираем устаревшее поле подвала
  delete p.footerText;
  p.elements = (p.elements||[]).map(el => {
    if (!el.props) el.props = {};
    if (el.props.textColor === undefined) el.props.textColor = '';
    if (el.type === 'image') {
      if (el.props.scale === undefined)       el.props.scale = 100;
      if (el.props.borderStyle === undefined) el.props.borderStyle = 'none';
    }
    if ((el.type === 'headline'||el.type === 'body') && !el.props.fontUnit) el.props.fontUnit = 'px';
    return el;
  });
  return p;
}

function _migrateLegacyPage(p) {
  const page = makeDefaultPage(p.style || 'classic', 'A4');
  page.id = p.id || page.id;
  const mast = page.elements.find(e => e.id === 'el_mast');
  if (mast) { mast.props.line1 = p.mast1||''; mast.props.line2 = p.mast2||''; mast.props.motto = p.motto||''; }
  const head = page.elements.find(e => e.id === 'el_head');
  if (head) head.props.text = p.headline||'';
  const body = page.elements.find(e => e.id === 'el_body');
  if (body) body.props.text = (p.paragraphs||[]).join('\n\n');
  const img  = page.elements.find(e => e.id === 'el_img');
  if (img) { img.props.url = p.heroImgUrl||''; img.props.caption = p.heroCredit||''; }
  const q    = page.elements.find(e => e.id === 'el_q');
  if (q) { q.props.text = p.quote||''; q.props.author = p.quoteAuthor||''; }
  return page;
}

// Единый источник истины для текстур бумаги — импортируется в editor и viewer
export const PAPER_IMG_BASE = 'modules/campaign-master-tools/assets/paper';
export const PAPER_IMAGES = {
  classic:'Classic.webp', gothic:'Gothic.webp', cyber:'Cyber.webp',
  luxury:'Luxury.webp', construct:'Construct.webp', noir:'Noir.webp',
  vintage:'Vintage.webp', artdeco:'Art_Deco.webp', tech:'Tech.webp',
  terminal:'Terminal.webp', grunge:'Grunge.webp', academic:'Academic.webp',
  archive:'Archive.webp', minimal:'Minimal.webp', industrial:'Industrial.webp',
  rustic:'Rustic.webp',
};

// Общий рендерер HTML-представления элемента (viewer + journal export)
export function renderElementHTML(el) {
  const p = el.props || {};
  const safe = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const md = t => t
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/~~(.+?)~~/g,'<s>$1</s>')
    .replace(/__(.+?)__/g,'<u>$1</u>');

  const colorStyle = p.textColor ? `color:${p.textColor};` : '';
  const ffStyle    = p.fontFamily ? `font-family:'${p.fontFamily}',serif;` : '';
  const fwStyle    = p.fontWeight ? `font-weight:${p.fontWeight};` : '';
  const fsStyle    = p.fontSize   ? `font-size:${p.fontSize}${p.fontUnit==='pt'?'pt':'px'};` : '';
  const lhStyle    = p.lineHeight    ? `line-height:${p.lineHeight};` : '';
  const lsStyle    = p.letterSpacing ? `letter-spacing:${p.letterSpacing}em;` : '';
  const ttStyle    = (p.textTransform && p.textTransform !== 'none') ? `text-transform:${p.textTransform};` : '';
  const taStyle    = p.textAlign ? `text-align:${p.textAlign};` : '';
  const base = `${colorStyle}${ffStyle}${fwStyle}${fsStyle}${lhStyle}${lsStyle}${ttStyle}${taStyle}`;

  switch(el.type) {
    case 'masthead':
      return `<div class="nwpc-el-masthead nwpc-style-${safe(p.style||'classic')}" style="${colorStyle}">
        ${p.line1 ? `<div class="nwpc-mast-line1" style="${colorStyle}${ffStyle}">${safe(p.line1)}</div>` : ''}
        ${p.line2 ? `<div class="nwpc-mast-line2" style="${colorStyle}${ffStyle}">${safe(p.line2)}</div>` : ''}
        ${p.motto ? `<div class="nwpc-mast-motto-row"><span class="nwpc-mast-line-dec"></span><span class="nwpc-mast-motto" style="${colorStyle}">${safe(p.motto)}</span><span class="nwpc-mast-line-dec"></span></div>` : ''}
      </div>`;

    case 'headline':
      return `<h2 class="nwpc-el-headline" style="${base}">${p.text ? md(safe(p.text)) : ''}</h2>`;

    case 'body': {
      const lines = (p.text||'').split('\n');
      const cols = (p.columns||1) > 1 ? `column-count:${p.columns};column-gap:1.4em;` : '';
      return `<div class="nwpc-el-body" style="${cols}">${
        lines.map((t,i) => t.trim()
          ? `<p class="${i===0&&p.dropCap?'nwpc-drop-cap':''}" style="margin-bottom:.8em;text-align:justify;line-height:1.7;${base}">${md(safe(t))}</p>`
          : `<p style="margin-bottom:.3em;">&nbsp;</p>`
        ).join('')
      }</div>`;
    }

    case 'rule':
      return `<div class="nwpc-el-rule-wrap" style="display:flex;align-items:center;width:100%;height:100%;">
        <div style="border-top:${p.thickness||2}px ${p.style||'solid'} ${p.color||'#1a1a1a'};width:100%;"></div>
      </div>`;

    case 'image': {
      const scale    = p.scale ?? 100;
      const objFit   = p.objectFit === 'cover' ? 'cover' : 'contain';
      const frameId  = p.imageFrameStyle && p.imageFrameStyle !== 'none' ? p.imageFrameStyle : '';
      const frameCls = frameId ? `nwpc-imgf-${frameId}` : '';
      return `<div class="nwpc-el-image ${frameCls}" style="width:100%;height:100%;overflow:hidden;">
        ${p.url ? `<img src="${safe(p.url)}" style="width:100%;height:calc(100% - ${p.caption?'28':'0'}px);object-fit:${objFit};transform:scale(${scale/100});transform-origin:top center;">` : ''}
        ${p.caption ? `<div class="nwpc-img-caption">${safe(p.caption)}</div>` : ''}
      </div>`;
    }

    case 'quote':
      return `<div class="nwpc-el-quote" style="${base}">
        <div class="nwpc-q-mark">"</div>
        <p class="nwpc-q-text" style="${base}">${p.text ? md(safe(p.text)) : ''}</p>
        ${p.author ? `<p class="nwpc-q-author">${safe(p.author)}</p>` : ''}
      </div>`;

    case 'box':
      return `<div class="nwpc-el-box${p.border?' nwpc-box-bordered':''}">
        ${p.title ? `<h4 class="nwpc-box-h" style="${base}">${md(safe(p.title))}</h4>` : ''}
        <p class="nwpc-box-p" style="${base}">${p.text ? md(safe(p.text)) : ''}</p>
      </div>`;

    case 'ad':
      return `<div class="nwpc-el-ad">
        <div class="nwpc-ad-title" style="${colorStyle}">${safe(p.title)||''}</div>
        <div class="nwpc-ad-body"  style="${colorStyle}">${p.text ? md(safe(p.text)) : ''}</div>
      </div>`;

    case 'byline':
      return `<div class="nwpc-el-byline" style="${colorStyle}">${safe(p.text)}</div>`;

    default: return '';
  }
}

// Конвертация страницы в HTML для журнала Foundry
export function pageToJournalHTML(page) {
  const safe = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const md = t => t
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/~~(.+?)~~/g,'<s>$1</s>')
    .replace(/__(.+?)__/g,'<u>$1</u>');
  let html = '';
  for (const el of (page.elements||[])) {
    const p = el.props||{};
    switch(el.type) {
      case 'masthead':  html += `<h1>${safe(p.line1)} ${safe(p.line2)}</h1>${p.motto?`<p><em>${safe(p.motto)}</em></p>`:''}`; break;
      case 'headline':  html += `<h2>${md(safe(p.text))}</h2>`; break;
      case 'byline':    html += `<p><small>${safe(p.text)}</small></p>`; break;
      case 'body':      for (const l of (p.text||'').split('\n')) { if(l.trim()) html += `<p>${md(safe(l))}</p>`; } break;
      case 'quote':     html += `<blockquote><p>${md(safe(p.text))}</p><footer>${safe(p.author)}</footer></blockquote>`; break;
      case 'image':     if(p.url) html += `<figure><img src="${safe(p.url)}" style="max-width:100%;"><figcaption>${safe(p.caption)}</figcaption></figure>`; break;
      case 'box':       html += `<aside><h4>${md(safe(p.title))}</h4><p>${md(safe(p.text))}</p></aside>`; break;
    }
  }
  return html;
}
