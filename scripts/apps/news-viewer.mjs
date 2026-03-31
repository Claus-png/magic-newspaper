// News Viewer — Teddy Bear

import { PAGE_SIZES, LiveNewspaper, PAPER_IMG_BASE, PAPER_IMAGES, renderElementHTML, pageToJournalHTML } from '../newspaper.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class NewsViewerApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options={}) {
    super(options);
    this._zoom = null;
    this._currentPage = 0;  // Локальная навигация — не синхронизируется с другими клиентами
  }

  static DEFAULT_OPTIONS = {
    id: 'cmt-news-viewer',
    classes: ['cmt-newspaper-viewer'],
    tag: 'div',
    window: { icon:'fas fa-newspaper', title:'', resizable:true, minimizable:true, positioned:true },
    position: { width:900, height:960, top:60, left:60 },
  };

  static PARTS = { sheet:{ template:'modules/campaign-master-tools/templates/news-viewer.hbs' } };

  async _prepareContext(options) {
    const data = LiveNewspaper.getData();
    // Проверяем что текущая страница не вышла за пределы (например после удаления страницы)
    this._currentPage = Math.min(this._currentPage, data.pages.length - 1);
    return {
      pageNum: this._currentPage + 1,
      totalPages: data.pages.length,
      isGM: game.user.isGM,
      title: this._getNewspaperTitle(data),
    };
  }

  _getNewspaperTitle(data) {
    const page = data.pages[this._currentPage] || data.pages[0];
    const mast = page?.elements?.find(e => e.type === 'masthead');
    if (mast && (mast.props.line1 || mast.props.line2)) {
      return `${mast.props.line1||''} ${mast.props.line2||''}`.trim();
    }
    return game.i18n.localize('cmt.viewer.title');
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Обновить заголовок окна динамически
    const titleEl = html.closest('.app')?.querySelector('.window-title');
    if (titleEl && context.title) titleEl.textContent = context.title;

    this._renderPage(html);

    // Навигация — только локальная, не мутирует world-settings
    html.querySelector('#nv-prev-btn')?.addEventListener('click', () => {
      if (this._currentPage > 0) {
        this._currentPage--;
        this._renderPage(html);
        this._updateNavButtons(html);
      }
    });
    html.querySelector('#nv-next-btn')?.addEventListener('click', () => {
      const total = LiveNewspaper.getData().pages.length;
      if (this._currentPage < total - 1) {
        this._currentPage++;
        this._renderPage(html);
        this._updateNavButtons(html);
      }
    });

    html.querySelector('#nv-open-editor-btn')?.addEventListener('click', ()=>{
      import('./news-editor.mjs').then(({NewsEditorApp})=>{
        const app=foundry.applications.instances.get('cmt-news-editor');
        if(app) app.bringToFront(); else new NewsEditorApp().render(true);
      });
    });

    // Кнопка "Показать всем" — только для GM, переключает страницу у всех клиентов
    html.querySelector('#nv-force-page-btn')?.addEventListener('click', () => {
      game.socket.emit('module.campaign-master-tools', {
        action: 'forceViewerPage',
        pageIdx: this._currentPage,
      });
      ui.notifications.info(game.i18n.localize('cmt.viewer.forcedPage'));
    });

    html.querySelector('#nv-export-btn')?.addEventListener('click', ()=>LiveNewspaper.exportJSON());
    html.querySelector('#nv-download-btn')?.addEventListener('click', ()=>this._download(html));
    html.querySelector('#nv-save-journal-btn')?.addEventListener('click', ()=>this._saveToPersonalJournal());

    // Зум
    html.querySelector('#nv-zoom-out')?.addEventListener('click', ()=>{
      this._zoom = Math.max(0.2, (this._zoom||1) - 0.1);
      this._applyZoom(html);
    });
    html.querySelector('#nv-zoom-in')?.addEventListener('click', ()=>{
      this._zoom = Math.min(3, (this._zoom||1) + 0.1);
      this._applyZoom(html);
    });
    html.querySelector('#nv-zoom-fit')?.addEventListener('click', ()=>{
      this._zoom = null;
      this._fitZoom(html);
    });

    if(this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null; }
    this._resizeObs = new ResizeObserver(()=>this._fitZoom(html));
    const wrap = html.querySelector('.nv-canvas-wrap');
    if(wrap) this._resizeObs.observe(wrap);
  }

  _updateNavButtons(html) {
    const total = LiveNewspaper.getData().pages.length;
    const prev = html.querySelector('#nv-prev-btn');
    const next = html.querySelector('#nv-next-btn');
    const lbl  = html.querySelector('.nwp-page-indicator');
    if (prev) prev.disabled = (this._currentPage === 0);
    if (next) next.disabled = (this._currentPage >= total - 1);
    if (lbl)  lbl.textContent = `${this._currentPage + 1} / ${total}`;
  }

  async _renderPage(html) {
    const data = LiveNewspaper.getData();
    const page = LiveNewspaper.getPage(this._currentPage);
    const area = html.querySelector('#nv-paper');
    if(!area) return;

    const sz = PAGE_SIZES[page.pageSize] || PAGE_SIZES.A4;
    let cw = (page.pageSize==='custom') ? (page.customW||sz.w) : sz.w;
    let ch = (page.pageSize==='custom') ? (page.customH||sz.h) : sz.h;
    if(page.orientation==='landscape') [cw,ch]=[ch,cw];

    area.innerHTML = '';
    area.className = `nwpc-paper nwpc-paper-${page.paperStyle||'classic'}`;
    area.style.width    = cw+'px';
    area.style.height   = ch+'px';
    area.style.position = 'relative';
    area.style.flexShrink = '0';

    const paperFile = PAPER_IMAGES[page.paperStyle];
    if(page.paperColor){
      area.style.background = page.paperColor;
    } else if(paperFile) {
      const url = `${PAPER_IMG_BASE}/${paperFile}`;
      if(page.orientation==='landscape'){
        area.style.backgroundImage = 'none';
        const overlay = document.createElement('div');
        overlay.className = 'nwpc-bg-overlay';
        Object.assign(overlay.style, {
          position:'absolute', top:'0', left:'0',
          width: ch+'px', height: cw+'px',
          backgroundImage:`url('${url}')`, backgroundSize:'100% 100%', backgroundRepeat:'no-repeat',
          transformOrigin:'0 0', transform:`rotate(-90deg) translateX(-${ch}px)`,
          pointerEvents:'none', zIndex:'1',
        });
        area.insertBefore(overlay, area.firstChild);
      } else {
        area.style.backgroundImage = `url('${url}')`;
        area.style.backgroundSize  = '100% 100%';
        area.style.backgroundRepeat= 'no-repeat';
      }
    }

    // Фильтрация элементов по видимости
    const visibleEls = (page.elements||[]).filter(el => {
      const v = el.visibility ?? 'all';
      if(v === 'gm')     return game.user.isGM;
      if(v === 'role')   return game.user.isGM || game.user.role >= (el.visibilityRole ?? 1);
      if(v === 'reveal') return game.user.isGM || (el.revealed === true);
      return true;
    });

    visibleEls.forEach(el => {
      const div=document.createElement('div');
      Object.assign(div.style, { position:'absolute', left:`${el.x}px`, top:`${el.y}px`, width:`${el.w}px`, height:`${el.h}px`, overflow:'hidden', zIndex:'10' });

      // Reveal-placeholder для скрытых элементов
      const v = el.visibility ?? 'all';
      if(v === 'reveal' && !el.revealed && !game.user.isGM) {
        div.innerHTML = `<div class="nwpc-el-hidden-reveal" data-el-id="${el.id}">
          <i class="fas fa-question-circle"></i>
          <span>${game.i18n.localize('cmt.viewer.clickToReveal')}</span>
        </div>`;
        div.querySelector('.nwpc-el-hidden-reveal')?.addEventListener('click', ()=>{
          game.socket.emit('module.campaign-master-tools', {
            action: 'revealElement',
            pageIdx: this._currentPage,
            elId: el.id,
          });
        });
      } else {
        div.innerHTML = renderElementHTML(el);
      }
      area.appendChild(div);
    });

    this._fitZoom(html, area, cw, ch);
    this._updateNavButtons(html);
  }

  _applyZoom(html) {
    const area = html?.querySelector('#nv-paper'); if(!area) return;
    const cw = parseInt(area.style.width)  || 794;
    const ch = parseInt(area.style.height) || 1123;
    const zoom = this._zoom || 1;
    area.style.transform       = `scale(${zoom})`;
    area.style.transformOrigin = 'top left';
    const outer = html.querySelector('.nv-canvas-outer');
    if(outer){
      outer.style.width  = Math.ceil(cw * zoom) + 'px';
      outer.style.height = Math.ceil(ch * zoom) + 'px';
    }
    const lbl = html.querySelector('#nv-zoom-label');
    if(lbl) lbl.textContent = Math.round(zoom * 100) + '%';
  }

  _fitZoom(html, area, canvasW, canvasH) {
    if(!area) area = html?.querySelector('#nv-paper');
    if(!area) return;
    const wrap = html?.querySelector('.nv-canvas-wrap'); if(!wrap) return;
    const cw = canvasW  || parseInt(area.style.width)  || 794;
    const ch = canvasH  || parseInt(area.style.height) || 1123;
    if(this._zoom === null || this._zoom === undefined) {
      const availW = wrap.clientWidth  - 40;
      const availH = wrap.clientHeight - 40;
      this._zoom = Math.min(1, availW>0?availW/cw:1, availH>0?availH/ch:1);
      this._zoom = Math.max(0.1, this._zoom);
    }
    this._applyZoom(html);
  }

  // Запрос GM сохранить страницу в личный журнал игрока
  async _saveToPersonalJournal() {
    const page = LiveNewspaper.getPage(this._currentPage);
    const mast = page.elements?.find(e => e.type === 'masthead');
    const title = mast
      ? `${mast.props.line1||''} ${mast.props.line2||''}`.trim()
      : game.i18n.localize('cmt.viewer.title');
    const fullTitle = `${title} — ${new Date().toLocaleDateString()}`;
    const content = pageToJournalHTML(page);

    if(game.user.isGM) {
      // GM создаёт запись напрямую (socket.emit не работает для отправителя)
      try {
        const entry = await JournalEntry.create({
          name: fullTitle,
          ownership: { default: 0, [game.user.id]: 3 },
        });
        await entry.createEmbeddedDocuments('JournalEntryPage', [{
          name: fullTitle,
          type: 'text',
          text: { content, format: 1 },
        }]);
        ui.notifications.info(game.i18n.localize('cmt.viewer.journalSaved'));
        setTimeout(() => entry?.sheet?.render(true), 500);
      } catch(e) {
        console.error('[CMT] Error creating personal journal:', e);
        ui.notifications.error(game.i18n.localize('cmt.viewer.journalError'));
      }
    } else {
      const gmOnline = game.users.some(u => u.isGM && u.active);
      if(!gmOnline) { ui.notifications.warn(game.i18n.localize('cmt.viewer.gmOffline')); return; }
      game.socket.emit('module.campaign-master-tools', {
        action:  'createPersonalJournal',
        userId:  game.user.id,
        title:   fullTitle,
        content,
      });
      ui.notifications.info(game.i18n.localize('cmt.viewer.journalRequested'));
    }
  }

  async _download(html) {
    const area = html.querySelector('#nv-paper'); if(!area) return;
    const origT = area.style.transform;
    area.style.transform = '';

    let moduleCSS = '';
    try {
      const resp = await fetch('modules/campaign-master-tools/styles/campaign-master.css');
      if(resp.ok) {
        moduleCSS = await resp.text();
        moduleCSS = moduleCSS.replace(/@import\s+url\([^)]*\)[^;]*;?\s*/gi, '');
        moduleCSS = moduleCSS.replace(/url\(['"]?\.\.\/assets\/[^)'"]*['"]?\)/gi, 'none');
      }
    } catch(e) { console.warn('[CMT] Could not fetch CSS for export:', e); }

    const page = LiveNewspaper.getPage(this._currentPage);
    const paperFile = PAPER_IMAGES[page.paperStyle];
    let paperB64 = '';
    if(!page.paperColor && paperFile) {
      try {
        const imgResp = await fetch(`${PAPER_IMG_BASE}/${paperFile}`);
        if(imgResp.ok) {
          const imgBlob = await imgResp.blob();
          paperB64 = await new Promise(res => {
            const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(imgBlob);
          });
        }
      } catch(e) { console.warn('[CMT] Could not inline paper image:', e); }
    }

    const cloneEl = area.cloneNode(true);
    cloneEl.style.transform = '';
    cloneEl.style.position  = 'relative';
    if(paperB64) {
      cloneEl.style.backgroundImage = `url('${paperB64}')`;
    }
    cloneEl.querySelectorAll('.nwpc-bg-overlay').forEach(el => {
      if(el.style.backgroundImage && el.style.backgroundImage.includes('modules/')) {
        el.style.backgroundImage = paperB64 ? `url('${paperB64}')` : '';
      }
    });
    cloneEl.querySelectorAll('img[src]').forEach(img => {
      const s = img.getAttribute('src') || '';
      if(s.startsWith('modules/') || s.startsWith('/modules/') || s.startsWith('../')) {
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
        img.style.opacity = '0';
      }
    });

    const content = cloneEl.outerHTML;
    area.style.transform = origT;

    const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Lato:wght@300;400;700&family=Caveat:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Montserrat:wght@400;700;900&family=Bebas+Neue&family=Special+Elite&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@400;700;900&family=Poppins:wght@300;400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Fira+Code:wght@400;700&family=VT323&family=Inter:wght@300;400;700&family=Roboto+Mono:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Fira+Sans:wght@300;400;700&display=swap';

    const full = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Газета</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#d8d0c0;padding:40px;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;}
${moduleCSS}
#nv-paper{position:relative!important;overflow:hidden!important;user-select:text!important;}
</style>
</head>
<body>
${content}
</body>
</html>`;

    const blob = new Blob([full], {type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `gazette-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
    ui.notifications.info(game.i18n.localize('cmt.viewer.downloadDone'));
  }

  _onClose(options) {
    if(this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null; }
    return super._onClose(options);
  }
}
