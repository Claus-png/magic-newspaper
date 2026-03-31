// News Editor — Teddy Bear

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
import { PAGE_SIZES, ELEMENT_DEFAULTS, makeDefaultPage, LiveNewspaper, PAPER_IMG_BASE, PAPER_IMAGES, renderElementHTML } from '../newspaper.mjs';

let GRID = 10;
let SNAP = true;

function loadPaperImageSize(style) {
  const file = PAPER_IMAGES[style];
  if (!file) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = `${PAPER_IMG_BASE}/${file}`;
  });
}

const EL_COLORS = {
  masthead:'#7a2020', headline:'#1e3a7a', body:'#1a5a1a',
  image:'#6a4800', rule:'#444', quote:'#5a1e7a',
  box:'#0d5555', ad:'#5a3a00', byline:'#404040'
};
const EL_ICONS  = {
  masthead:'fas fa-newspaper', headline:'fas fa-heading', body:'fas fa-align-justify',
  image:'fas fa-image', rule:'fas fa-grip-lines', quote:'fas fa-quote-left',
  box:'fas fa-square', ad:'fas fa-rectangle-ad', byline:'fas fa-user-edit'
};
const EL_LABELS = {
  masthead:'Шапка', headline:'Заголовок', body:'Текст статьи',
  image:'Изображение', rule:'Разделитель', quote:'Цитата',
  box:'Блок', ad:'Объявление', byline:'Автор'
};

const FONT_LIST = [
  'Playfair Display','Lato','Cormorant Garamond','Merriweather','EB Garamond',
  'Lora','Cinzel','Georgia','Orbitron','Share Tech Mono','Bebas Neue',
  'Montserrat','Special Elite','Caveat','VT323','Fira Code','IBM Plex Mono',
  'Courier Prime','Poppins','Roboto Mono','Inter','Fira Sans',
];

const IMG_FRAME_CATS = [
  { cat:'Классика',  styles:[{id:'heritage',label:'Heritage'},{id:'editorial',label:'Editorial'},{id:'chronicle',label:'Chronicle'},{id:'broadside',label:'Broadside'},{id:'gazette',label:'Gazette'}] },
  { cat:'Готика',    styles:[{id:'cathedral',label:'Cathedral'},{id:'manuscript',label:'Manuscript'},{id:'ornament',label:'Ornament'},{id:'crypt',label:'Crypt'},{id:'victorian',label:'Victorian'}] },
  { cat:'Кибер',     styles:[{id:'neonblue',label:'Неон синий'},{id:'neonpink',label:'Неон розовый'},{id:'scanline',label:'Scanline'},{id:'glitch',label:'Glitch'},{id:'crtterm',label:'Terminal'}] },
  { cat:'Люкс',      styles:[{id:'goldleaf',label:'Золото'},{id:'platinum',label:'Платина'},{id:'velvet',label:'Бархат'},{id:'diamond',label:'Бриллиант'},{id:'royal',label:'Роял'}] },
  { cat:'Нуар',      styles:[{id:'shadow',label:'Тень'},{id:'spotlight',label:'Прожектор'},{id:'silhouette',label:'Силуэт'},{id:'rain',label:'Дождь'},{id:'smoke',label:'Дым'}] },
  { cat:'Винтаж',    styles:[{id:'typewriter',label:'Машинопись'},{id:'agedpaper',label:'Пожелтевший'},{id:'sepiaf',label:'Сепия'},{id:'tornedge',label:'Рваный'},{id:'stamp',label:'Штамп'}] },
  { cat:'Ар-деко',   styles:[{id:'sunburst',label:'Лучи'},{id:'chevron',label:'Шеврон'},{id:'fan',label:'Веер'},{id:'geometric',label:'Геометрия'},{id:'gatsby',label:'Гэтсби'}] },
  { cat:'Тех',       styles:[{id:'dashboard',label:'Дашборд'},{id:'dataframe',label:'Data'},{id:'techcard',label:'Card'},{id:'techmodule',label:'Module'},{id:'hologram',label:'Голограмма'}] },
  { cat:'Терминал',  styles:[{id:'greencrt',label:'Зел. CRT'},{id:'amberscan',label:'Янтарный'},{id:'ascii',label:'ASCII'},{id:'tblink',label:'Blink'},{id:'matrix',label:'Matrix'}] },
  { cat:'Гранж',     styles:[{id:'spray',label:'Спрей'},{id:'ripped',label:'Рваный'},{id:'stencil',label:'Трафарет'},{id:'dirty',label:'Грязь'},{id:'punk',label:'Панк'}] },
  { cat:'Академич.', styles:[{id:'thesis',label:'Диссертация'},{id:'aclibrary',label:'Библ.'},{id:'footnote',label:'Сноска'},{id:'manuac',label:'Манускрипт'},{id:'archivedoc',label:'Архив.'}] },
  { cat:'Архивный',  styles:[{id:'classified',label:'Секретно'},{id:'datestamp',label:'Штамп'},{id:'folder',label:'Папка'},{id:'declassified',label:'Рассекречено'},{id:'microfilm',label:'Плёнка'}] },
  { cat:'Минимализм',styles:[{id:'clean',label:'Чистый'},{id:'minline',label:'Линия'},{id:'minspace',label:'Пространство'},{id:'accent',label:'Акцент'},{id:'mono',label:'Моно'}] },
  { cat:'Индустр.',  styles:[{id:'metal',label:'Металл'},{id:'rivet',label:'Заклёпка'},{id:'warning',label:'Опасность'},{id:'concrete',label:'Бетон'},{id:'factory',label:'Завод'}] },
];

export class NewsEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) {
    super(options);
    this._currentPage  = 0;
    this._selectedId   = null;
    this._zoom         = 0.75;
    this._saveTimer    = null;
    this._tab          = 'canvas';
    this._history      = [];
    this._historyIdx   = -1;
    this._maxHistory   = 50;
    this._showGrid     = true;
    this._lockedIds    = new Set();
    /* Auto-save indicator */
    this._lastSaveTs   = null;   // timestamp of last successful save
    this._saveTicker   = null;   // setInterval handle
  }

  static DEFAULT_OPTIONS = {
    id: 'cmt-news-editor',
    classes: ['cmt-newspaper-editor'],
    tag: 'div',
    window: { icon:'fas fa-newspaper', title:'Конструктор Газеты', resizable:true, minimizable:true, positioned:true },
    position: {
      width:  Math.min(1420, (window.innerWidth  || 1440) - 32),
      height: Math.min(940,  (window.innerHeight || 900)  - 32),
      top: 16, left: 16,
    },
  };

  static PARTS = { sheet:{ template:'modules/campaign-master-tools/templates/news-editor.hbs' } };

  async _prepareContext(options) {
    const data = LiveNewspaper.getData();
    this._currentPage = Math.min(this._currentPage, data.pages.length-1);
    return {
      pageNum: this._currentPage,
      totalPages: data.pages.length,
      pages: data.pages.map((p,i) => {
        const mast = p.elements?.find(e=>e.type==='masthead');
        return { index:i, label:`${i+1}. ${mast?.props?.line1||'Страница'}${p.isDraft?' [✎]':''}` };
      }),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    /* --- Инициализация селектора страниц --- */
    const sel = html.querySelector('#ed-page-select');
    if(sel) sel.innerHTML = context.pages.map(p=>`<option value="${p.index}"${p.index===context.pageNum?' selected':''}>${p.label}</option>`).join('');

    this._syncToolbarToPage(html);
    this._buildCanvas(html);
    if(this._history.length===0){ this._autoFitZoom(html); this._pushHistory(); }
    else this._applyZoom(html);

    this._renderTab(html);
    this._updateStatusBar(html);
    this._updateUndoRedoBtns(html);

    /* --- Страницы --- */
    sel?.addEventListener('change', e=>{ this._currentPage=parseInt(e.target.value); this._selectedId=null; this.render({force:true}); });
    html.querySelector('#ed-add-page')?.addEventListener('click', ()=>this._addPage(html));
    html.querySelector('#ed-rm-page')?.addEventListener('click',  ()=>this._removePage(html));

    /* --- Табы --- */
    html.querySelectorAll('.ed-tab-btn').forEach(btn=>btn.addEventListener('click', ()=>{ this._tab=btn.dataset.tab; this._renderTab(html); }));

    /* --- Стиль бумаги --- */
    html.querySelector('#ed-paper-style')?.addEventListener('change', async e=>await this._onStyleChange(e.target.value,html));
    html.querySelector('#ed-orientation')?.addEventListener('change', async e=>{ const p=this._getPageData(); p.orientation=e.target.value; await this._savePageData(p); this._buildCanvas(html); this._autoFitZoom(html); });
    html.querySelector('#ed-page-size')?.addEventListener('change', async e=>await this._onPageSizeChange(e.target.value,html));
    html.querySelector('#ed-custom-w')?.addEventListener('change', async ()=>{ const p=this._getPageData(); p.customW=parseInt(html.querySelector('#ed-custom-w').value)||794; await this._savePageData(p); this._buildCanvas(html); this._applyZoom(html); });
    html.querySelector('#ed-custom-h')?.addEventListener('change', async ()=>{ const p=this._getPageData(); p.customH=parseInt(html.querySelector('#ed-custom-h').value)||1123; await this._savePageData(p); this._buildCanvas(html); this._applyZoom(html); });

    /* --- Цвет бумаги --- */
    const cInp=html.querySelector('#ed-paper-color'), cHex=html.querySelector('#ed-paper-color-hex'), cPrev=html.querySelector('#ed-paper-color-preview');
    if(cInp&&cHex){
      const updateColor=async()=>{ cHex.value=cInp.value; if(cPrev) cPrev.style.background=cInp.value; const p=this._getPageData(); p.paperColor=cInp.value; const c=html.querySelector('#nwpc-canvas'); if(c) c.style.background=cInp.value; await this._savePageData(p); };
      cInp.addEventListener('input', updateColor);
      cHex.addEventListener('change', ()=>{ if(/^#[0-9a-fA-F]{6}$/.test(cHex.value)){ cInp.value=cHex.value; updateColor(); } });
      html.querySelector('#ed-paper-color-reset')?.addEventListener('click', async()=>{ const p=this._getPageData(); p.paperColor=''; cInp.value='#f4f1ea'; cHex.value=''; if(cPrev) cPrev.style.background='#f4f1ea'; const c=html.querySelector('#nwpc-canvas'); if(c) c.style.background=''; await this._savePageData(p); });
      // Клик по preview открывает color picker
      cPrev?.parentElement?.addEventListener('click', ()=>cInp.click());
    }

    /* --- Сетка / Привязка --- */
    html.querySelector('#ed-grid-toggle')?.addEventListener('click', e=>{ this._showGrid=!this._showGrid; e.currentTarget.classList.toggle('active',this._showGrid); const wrap=html.querySelector('#ed-canvas-wrap'); if(wrap) wrap.classList.toggle('nwpc-grid-hidden',!this._showGrid); });
    html.querySelector('#ed-snap-toggle')?.addEventListener('click', e=>{ SNAP=!SNAP; e.currentTarget.classList.toggle('active',SNAP); ui.notifications.info(SNAP?'Привязка к сетке включена':'Привязка к сетке выключена'); });

    /* --- Зум --- */
    html.querySelector('#ed-zoom-in')?.addEventListener('click',  ()=>{ this._zoom=Math.min(3,this._zoom+0.1); this._applyZoom(html); });
    html.querySelector('#ed-zoom-out')?.addEventListener('click', ()=>{ this._zoom=Math.max(0.1,this._zoom-0.1); this._applyZoom(html); });
    html.querySelector('#ed-zoom-fit')?.addEventListener('click', ()=>this._autoFitZoom(html));
    html.querySelector('#ed-zoom-100')?.addEventListener('click', ()=>{ this._zoom=1.0; this._applyZoom(html); });

    /* --- Undo/Redo buttons --- */
    html.querySelector('#ed-undo-btn')?.addEventListener('click', ()=>this._undo(html));
    html.querySelector('#ed-redo-btn')?.addEventListener('click', ()=>this._redo(html));

    /* --- Добавить элемент --- */
    html.querySelectorAll('.ed-add-el-btn').forEach(btn=>btn.addEventListener('click', ()=>this._addElement(btn.dataset.type,html)));

    /* --- Выравнивание --- */
    html.querySelectorAll('.nwpc-align-btn').forEach(btn=>btn.addEventListener('click', ()=>this._alignElement(btn.dataset.align,html)));

    /* --- Действия --- */
    html.querySelector('#ed-save-btn')?.addEventListener('click',     ()=>this._save(html));
    html.querySelector('#ed-draft-btn')?.addEventListener('click',    ()=>this._saveDraft(html));
    html.querySelector('#ed-author-btn')?.addEventListener('click',   ()=>this._openAuthorDialog(html));
    html.querySelector('#ed-publish-btn')?.addEventListener('click',  ()=>this._publish(html));
    html.querySelector('#ed-breaking-btn')?.addEventListener('click', ()=>this._openBreakingNewsDialog(html));
    html.querySelector('#ed-templates-btn')?.addEventListener('click',()=>this._openTemplateGallery(html));
    html.querySelector('#ed-view-btn')?.addEventListener('click',     ()=>this._openViewer(html));
    html.querySelector('#ed-html2text-btn')?.addEventListener('click',()=>this._openHtml2Text(html));
    html.querySelector('#ed-reset-btn')?.addEventListener('click',    ()=>this._resetPage(html));
    html.querySelector('#ed-export-btn')?.addEventListener('click',   ()=>this._exportJSON());
    html.querySelector('#ed-import-btn')?.addEventListener('click',   ()=>this._importJSON(html));

    /* --- Авто-сохранение: индикатор + кнопка восстановления --- */
    const restoreBtn = html.querySelector('#ed-autosave-restore');
    if(restoreBtn){
      /* Show restore button only when an auto-draft exists */
      const ad = LiveNewspaper.getAutoDraft();
      restoreBtn.style.display = ad ? 'inline-flex' : 'none';
      restoreBtn.addEventListener('click', ()=>this._restoreAutoDraft(html));
    }
    this._updateSaveIndicator(html);
    this._startSaveTicker(html);

    /* --- Клик на пустой холст --- */
    html.querySelector('#nwpc-canvas')?.addEventListener('mousedown', e=>{ if(e.target.id==='nwpc-canvas'||e.target.classList.contains('nwpc-bg-overlay')) this._selectElement(null,html); });

    /* --- Cursor coords --- */
    html.querySelector('#nwpc-canvas')?.addEventListener('mousemove', e=>this._updateCursorCoords(e,html));

    /* --- Keyboard --- */
    html.setAttribute('tabindex','0');
    html.addEventListener('keydown', e=>{
      const focused=html.querySelector(':focus');
      const inInput=focused&&(focused.tagName==='INPUT'||focused.tagName==='TEXTAREA');
      if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){ e.preventDefault(); this._undo(html); return; }
      if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){ e.preventDefault(); this._redo(html); return; }
      if((e.ctrlKey||e.metaKey)&&e.key==='s'){ e.preventDefault(); this._save(html); return; }
      if((e.ctrlKey||e.metaKey)&&e.key==='d'&&this._selectedId){ e.preventDefault(); this._duplicateSelected(html); return; }
      if(e.key==='Escape'){ this._selectElement(null,html); return; }
      if(e.key==='f'&&!inInput){ this._autoFitZoom(html); return; }
      if(e.key==='g'&&!inInput){ html.querySelector('#ed-grid-toggle')?.click(); return; }
      if(e.key==='='||e.key==='+'&&!inInput){ this._zoom=Math.min(3,this._zoom+0.1); this._applyZoom(html); return; }
      if(e.key==='-'&&!inInput){ this._zoom=Math.max(0.1,this._zoom-0.1); this._applyZoom(html); return; }
      /* Стрелки для точного позиционирования */
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&this._selectedId&&!inInput){
        e.preventDefault();
        const page=this._getPageData(); const el=page.elements.find(e2=>e2.id===this._selectedId); if(!el) return;
        const step=e.shiftKey?GRID:1;
        if(e.key==='ArrowLeft')  el.x=Math.max(0,el.x-step);
        if(e.key==='ArrowRight') el.x=Math.min(this._getCanvasSize(page).w-el.w,el.x+step);
        if(e.key==='ArrowUp')    el.y=Math.max(0,el.y-step);
        if(e.key==='ArrowDown')  el.y=Math.min(this._getCanvasSize(page).h-el.h,el.y+step);
        const div=html.querySelector(`[data-el-id="${this._selectedId}"]`);
        if(div){ div.style.left=el.x+'px'; div.style.top=el.y+'px'; }
        this._updateGeomInputs(html,el);
        this._scheduleSave(html,true);
        return;
      }
      if((e.key==='Delete'||e.key==='Backspace')&&this._selectedId&&!inInput){ this._deleteSelected(html); }
    });

    /* --- Восстановить выделение после рендера --- */
    if(this._selectedId){
      const el=html.querySelector(`[data-el-id="${this._selectedId}"]`);
      if(el){ el.classList.add('nwpc-selected'); this._showProps(html,this._selectedId); }
      else this._showPropsEmpty(html);
    } else this._showPropsEmpty(html);

    /* --- Обновить кнопки выравнивания --- */
    this._updateAlignGroup(html);

    // sync author badge
    this._updateAuthorBadge(html);
  }

  // --- CANVAS ---

  _buildCanvas(html) {
    const canvas=html.querySelector('#nwpc-canvas'); if(!canvas) return;
    canvas.innerHTML='';
    const page=this._getPageData();
    const {w,h}=this._getCanvasSize(page);
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    canvas.className=`nwpc-paper nwpc-paper-${page.paperStyle||'classic'}`;
    canvas.id='nwpc-canvas';
    this._applyCanvasStyle(canvas,page);
    (page.elements||[]).forEach(el=>canvas.appendChild(this._createElementEl(el,html,w,h)));
    this._updateStatusBar(html);

    // drop targets
    canvas.addEventListener('dragover', e=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; canvas.classList.add('nwpc-drop-hover'); });
    canvas.addEventListener('dragleave', ()=>canvas.classList.remove('nwpc-drop-hover'));
    canvas.addEventListener('drop', e=>{ canvas.classList.remove('nwpc-drop-hover'); this._onCanvasDrop(e,html); });
  }

  _applyCanvasStyle(canvas, page) {
    canvas.querySelectorAll('.nwpc-bg-overlay').forEach(el=>el.remove());
    const paperFile = PAPER_IMAGES[page.paperStyle];
    if(page.paperColor){ canvas.style.backgroundImage=''; canvas.style.backgroundSize=''; canvas.style.background=page.paperColor; return; }
    canvas.style.background='';
    if(!paperFile){ canvas.style.backgroundImage=''; return; }
    const url=`${PAPER_IMG_BASE}/${paperFile}`;
    const isLandscape=(page.orientation==='landscape');
    if(isLandscape){
      canvas.style.backgroundImage='none';
      const {w,h}=this._getCanvasSize(page);
      const ov=document.createElement('div'); ov.className='nwpc-bg-overlay';
      Object.assign(ov.style,{ position:'absolute', top:'0', left:'0', width:h+'px', height:w+'px', backgroundImage:`url('${url}')`, backgroundSize:'100% 100%', backgroundRepeat:'no-repeat', transformOrigin:'0 0', transform:`rotate(-90deg) translateX(-${h}px)`, pointerEvents:'none', zIndex:'1' });
      canvas.insertBefore(ov,canvas.firstChild);
    } else {
      canvas.style.backgroundImage=`url('${url}')`;
      canvas.style.backgroundSize='100% 100%';
      canvas.style.backgroundRepeat='no-repeat';
    }
  }

  _createElementEl(elData,html,cW,cH){
    const isLocked=this._lockedIds.has(elData.id);
    const div=document.createElement('div');
    div.className='nwpc-element'+(isLocked?' nwpc-locked':'');
    div.dataset.elId=elData.id;
    div.style.cssText=`left:${elData.x}px;top:${elData.y}px;width:${elData.w}px;height:${elData.h}px;z-index:10;`;

    /* Кастомные стили элемента */
    const es=elData.style||{};
    if(es.opacity!=null&&es.opacity!==100) div.style.opacity=es.opacity/100;
    if(es.rotation) div.style.transform=`rotate(${es.rotation}deg)`;

    /* Метка (drag handle) */
    const color=EL_COLORS[elData.type]||'#444';
    const label=document.createElement('div');
    label.className='nwpc-el-label';
    label.style.background=color;
    label.innerHTML=`<i class="${EL_ICONS[elData.type]||'fas fa-square'}"></i>${EL_LABELS[elData.type]||elData.type}${isLocked?' <i class="fas fa-lock" style="font-size:9px;"></i>':''}${
      elData.visibility==='gm'     ? ' <i class="fas fa-user-shield nwpc-vis-badge" style="color:#ff6b6b;" title="Только GM"></i>'
    : elData.visibility==='role'   ? ' <i class="fas fa-users nwpc-vis-badge" style="color:#ffd93d;" title="По роли"></i>'
    : elData.visibility==='reveal' ? ' <i class="fas fa-question nwpc-vis-badge" style="color:#4a90d9;" title="Reveal on click"></i>'
    : ''
    }`;
    div.appendChild(label);

    /* Контент */
    const content=document.createElement('div');
    content.className='nwpc-el-content';
    content.innerHTML=this._renderElHTML(elData);

    /* Кастомные стили контента */
    if(es.bgColor)       content.style.background=es.bgColor;
    if(es.borderWidth&&es.borderWidth>0){
      content.style.border=`${es.borderWidth}px ${es.borderStyle||'solid'} ${es.borderColor||'#000'}`;
    }
    if(es.borderRadius)  content.style.borderRadius=es.borderRadius+'px';
    if(es.shadow)        content.style.boxShadow='3px 3px 12px rgba(0,0,0,0.3)';
    div.appendChild(content);

    /* Resize handles (только если не заблокирован) */
    if(!isLocked){
      ['nw','n','ne','e','se','s','sw','w'].forEach(dir=>{
        const rh=document.createElement('div');
        rh.className=`nwpc-resize nwpc-resize-${dir}`;
        rh.dataset.dir=dir;
        rh.addEventListener('mousedown', e=>{ e.preventDefault(); e.stopPropagation(); this._selectElement(elData.id,html); this._startResize(e,elData,div,html,dir,cW,cH); });
        div.appendChild(rh);
      });
    }

    /* Mousedown на метку = drag, на content = select */
    if(!isLocked){
      label.addEventListener('mousedown', e=>{ e.preventDefault(); this._selectElement(elData.id,html); this._startDrag(e,elData,div,html,cW,cH); });
    } else {
      label.addEventListener('mousedown', e=>{ e.preventDefault(); this._selectElement(elData.id,html); });
    }
    content.addEventListener('mousedown', e=>{ e.stopPropagation(); this._selectElement(elData.id,html); });

    return div;
  }

  // --- DRAG / RESIZE ---

  _startDrag(e,elData,div,html,cW,cH){
    const sc=this._zoom, sx=e.clientX, sy=e.clientY, ox=elData.x, oy=elData.y;
    const wrap=html.querySelector('.nwpc-canvas-wrap');
    const sxs=wrap?wrap.scrollLeft:0, sys=wrap?wrap.scrollTop:0;
    const mm=ev=>{
      const sdx=wrap?(wrap.scrollLeft-sxs)/sc:0, sdy=wrap?(wrap.scrollTop-sys)/sc:0;
      const dx=(ev.clientX-sx)/sc+sdx, dy=(ev.clientY-sy)/sc+sdy;
      let nx=ox+dx, ny=oy+dy;
      if(SNAP){ nx=Math.round(nx/GRID)*GRID; ny=Math.round(ny/GRID)*GRID; }
      elData.x=Math.max(0,Math.min(cW-elData.w,nx));
      elData.y=Math.max(0,Math.min(cH-elData.h,ny));
      div.style.left=elData.x+'px'; div.style.top=elData.y+'px';
      this._updateGeomInputs(html,elData);
      this._updateCursorPos(html,elData.x,elData.y);
    };
    const mu=()=>{ document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); this._pushHistory(); this._scheduleSave(html); };
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  }

  _startResize(e,elData,div,html,dir,cW,cH){
    const sc=this._zoom, sx=e.clientX, sy=e.clientY, ox=elData.x, oy=elData.y, ow=elData.w, oh=elData.h, MIN=20;
    const wrap=html.querySelector('.nwpc-canvas-wrap');
    const sxs=wrap?wrap.scrollLeft:0, sys=wrap?wrap.scrollTop:0;
    const mm=ev=>{
      const sdx=wrap?(wrap.scrollLeft-sxs)/sc:0, sdy=wrap?(wrap.scrollTop-sys)/sc:0;
      const dx=(ev.clientX-sx)/sc+sdx, dy=(ev.clientY-sy)/sc+sdy;
      let {x,y,w,h}={x:ox,y:oy,w:ow,h:oh};
      if(dir.includes('e')) w=Math.max(MIN,SNAP?Math.round((ow+dx)/GRID)*GRID:ow+dx);
      if(dir.includes('s')) h=Math.max(MIN,SNAP?Math.round((oh+dy)/GRID)*GRID:oh+dy);
      if(dir.includes('w')){ w=Math.max(MIN,SNAP?Math.round((ow-dx)/GRID)*GRID:ow-dx); x=ox+ow-w; }
      if(dir.includes('n')){ h=Math.max(MIN,SNAP?Math.round((oh-dy)/GRID)*GRID:oh-dy); y=oy+oh-h; }
      x=Math.max(0,x); y=Math.max(0,y); w=Math.min(w,cW-x); h=Math.min(h,cH-y);
      elData.x=x; elData.y=y; elData.w=w; elData.h=h;
      Object.assign(div.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
      this._updateGeomInputs(html,elData);
    };
    const mu=()=>{ document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); this._pushHistory(); this._scheduleSave(html); };
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  }

  // --- SELECTION & PROPS ---

  _selectElement(id,html){
    this._selectedId=id;
    html.querySelectorAll('.nwpc-element').forEach(el=>el.classList.remove('nwpc-selected'));
    if(id){ html.querySelector(`[data-el-id="${id}"]`)?.classList.add('nwpc-selected'); this._showProps(html,id); }
    else this._showPropsEmpty(html);
    this._updateAlignGroup(html);
    this._updateStatusBar(html);
  }

  _showPropsEmpty(html){
    const p=html.querySelector('#nwpc-props');
    if(p) p.innerHTML=`<div class="nwpc-props-empty"><i class="fas fa-mouse-pointer"></i><p>Выберите элемент</p><small>Клик — выделить · Метка — переместить</small></div>`;
  }

  _showProps(html,id){
    const panel=html.querySelector('#nwpc-props'); if(!panel) return;
    const page=this._getPageData();
    const elData=page.elements.find(e=>e.id===id); if(!elData) return;
    const color=EL_COLORS[elData.type]||'#444';
    const p=elData.props||{};
    const s=elData.style||{};
    const isLocked=this._lockedIds.has(id);

    panel.innerHTML=`
      <div class="nwpc-props-header" style="background:${color};">
        <i class="${EL_ICONS[elData.type]||'fas fa-square'}"></i>
        <span>${EL_LABELS[elData.type]||elData.type}</span>
        <div class="nwpc-props-header-actions">
          <button class="nwpc-ph-btn nwpc-props-dup-btn"  title="Дублировать (Ctrl+D)"><i class="fas fa-copy"></i></button>
          <button class="nwpc-ph-btn nwpc-props-lock-btn" title="${isLocked?'Разблокировать':'Заблокировать'}"><i class="fas fa-${isLocked?'lock':'unlock'}"></i></button>
          <button class="nwpc-ph-btn nwpc-props-del-btn"  title="Удалить (Del)"><i class="fas fa-trash"></i></button>
        </div>
      </div>

      <!-- СЕКЦИЯ: Геометрия -->
      <div class="nwpc-acc-section open" data-section="geom">
        <div class="nwpc-acc-hdr"><i class="fas fa-ruler-combined"></i> Геометрия <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          <div class="nwpc-geom-grid">
            <label>X<input class="nwpc-geom nwpc-mini-inp" data-field="x" type="number" step="${GRID}" value="${elData.x}"></label>
            <label>Y<input class="nwpc-geom nwpc-mini-inp" data-field="y" type="number" step="${GRID}" value="${elData.y}"></label>
            <label>W<input class="nwpc-geom nwpc-mini-inp" data-field="w" type="number" step="${GRID}" value="${elData.w}"></label>
            <label>H<input class="nwpc-geom nwpc-mini-inp" data-field="h" type="number" step="${GRID}" value="${elData.h}"></label>
          </div>
          <div class="nwpc-geom-row" style="margin-top:6px;">
            <label style="font-size:.72rem;">Поворот°</label>
            <input class="nwpc-mini-inp nwpc-style-inp" data-skey="rotation" type="number" min="-180" max="180" step="1" value="${s.rotation||0}" style="width:60px;">
            <button class="nwpc-xs-btn" id="nwpc-rot-reset" title="Сбросить поворот"><i class="fas fa-undo"></i></button>
          </div>
        </div>
      </div>

      <!-- СЕКЦИЯ: Вид элемента -->
      <div class="nwpc-acc-section open" data-section="appearance">
        <div class="nwpc-acc-hdr"><i class="fas fa-paint-brush"></i> Оформление <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          <!-- Фон -->
          <div class="nwpc-prop-row">
            <label>Фон элемента</label>
            <div class="nwpc-color-row">
              <label class="nwpc-color-swatch-btn"><input type="color" class="nwpc-style-inp" data-skey="bgColor" value="${s.bgColor||'#ffffff'}" style="opacity:0;position:absolute;width:0;height:0;"><span class="nwpc-color-preview" style="background:${s.bgColor||'transparent'};border:1px dashed #555;"></span></label>
              <input type="text" class="nwpc-mini-inp nwpc-style-inp" data-skey="bgColor" value="${s.bgColor||''}" placeholder="прозрачный" style="flex:1;">
              <button class="nwpc-xs-btn nwpc-clear-bgcolor" title="Убрать фон"><i class="fas fa-times"></i></button>
            </div>
          </div>
          <!-- Непрозрачность -->
          <div class="nwpc-prop-row">
            <label>Непрозрачность: <span id="opacity-lbl">${s.opacity??100}%</span></label>
            <input type="range" class="nwpc-style-inp" data-skey="opacity" min="5" max="100" value="${s.opacity??100}" style="width:100%;">
          </div>
          <!-- Обводка -->
          <div class="nwpc-prop-row">
            <label>Обводка</label>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              <input type="number" class="nwpc-mini-inp nwpc-style-inp" data-skey="borderWidth" min="0" max="20" value="${s.borderWidth||0}" style="width:46px;" title="Толщина">
              <select class="nwpc-mini-inp nwpc-style-inp" data-skey="borderStyle" style="width:80px;">
                ${['solid','dashed','dotted','double','ridge','groove'].map(st=>`<option value="${st}" ${(s.borderStyle||'solid')===st?'selected':''}>${st}</option>`).join('')}
              </select>
              <label class="nwpc-color-swatch-btn"><input type="color" class="nwpc-style-inp" data-skey="borderColor" value="${s.borderColor||'#000000'}" style="opacity:0;position:absolute;width:0;height:0;"><span class="nwpc-color-preview" style="background:${s.borderColor||'#000000'};"></span></label>
            </div>
          </div>
          <!-- Скругление + Тень -->
          <div class="nwpc-prop-row">
            <div style="display:flex;gap:8px;align-items:center;">
              <label style="white-space:nowrap;">Радиус: <input type="number" class="nwpc-mini-inp nwpc-style-inp" data-skey="borderRadius" min="0" max="60" value="${s.borderRadius||0}" style="width:46px;">px</label>
              <label style="display:flex;align-items:center;gap:5px;white-space:nowrap;"><input type="checkbox" class="nwpc-style-inp" data-skey="shadow" ${s.shadow?'checked':''}> Тень</label>
            </div>
          </div>
        </div>
      </div>

      <!-- СЕКЦИЯ: Цвет текста (не для rule / image) -->
      ${!['rule','image'].includes(elData.type)?`
      <div class="nwpc-acc-section open" data-section="textcolor">
        <div class="nwpc-acc-hdr"><i class="fas fa-font"></i> Цвет текста <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          <div class="nwpc-color-row">
            <label class="nwpc-color-swatch-btn"><input id="nwpc-text-color" type="color" value="${p.textColor||'#333333'}" style="opacity:0;position:absolute;width:0;height:0;"><span class="nwpc-color-preview" style="background:${p.textColor||'#333333'};"></span></label>
            <input id="nwpc-text-color-hex" type="text" value="${p.textColor||''}" placeholder="#333333" class="nwpc-mini-inp" style="flex:1;">
            <button id="nwpc-text-color-reset" class="nwpc-xs-btn"><i class="fas fa-undo"></i></button>
          </div>
        </div>
      </div>`:``}

      <!-- СЕКЦИЯ: Содержимое -->
      <div class="nwpc-acc-section open" data-section="content">
        <div class="nwpc-acc-hdr"><i class="fas fa-edit"></i> Содержимое <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          ${this._buildPropsHTML(elData)}
        </div>
      </div>

      <!-- СЕКЦИЯ: Слои и выравнивание -->
      <div class="nwpc-acc-section" data-section="layers">
        <div class="nwpc-acc-hdr"><i class="fas fa-layer-group"></i> Слои и выравнивание <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="nwpc-sm-btn nwpc-props-to-front" style="flex:1;"><i class="fas fa-arrow-up"></i> Вперёд</button>
            <button class="nwpc-sm-btn nwpc-props-to-back"  style="flex:1;"><i class="fas fa-arrow-down"></i> Назад</button>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="left"    title="По левому краю"><i class="fas fa-arrow-left"></i></button>
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="hcenter" title="По горизонт. центру"><i class="fas fa-align-center"></i></button>
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="right"   title="По правому краю"><i class="fas fa-arrow-right"></i></button>
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="top"     title="По верхнему краю"><i class="fas fa-arrow-up"></i></button>
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="vcenter" title="По вертикальному центру"><i class="fas fa-arrows-alt-v"></i></button>
            <button class="nwpc-xs-btn nwpc-align-btn" data-align="bottom"  title="По нижнему краю"><i class="fas fa-arrow-down"></i></button>
          </div>
        </div>
      </div>

      <!-- СЕКЦИЯ: Видимость (Block B) -->
      <div class="nwpc-acc-section" data-section="visibility">
        <div class="nwpc-acc-hdr"><i class="fas fa-eye"></i> Видимость <i class="nwpc-acc-arrow fas fa-chevron-down"></i></div>
        <div class="nwpc-acc-body">
          <select id="nwpc-vis-mode" class="nwpc-prop-input" style="width:100%;">
            <option value="all"    ${(elData.visibility??'all')==='all'    ?'selected':''}>Все игроки</option>
            <option value="gm"     ${elData.visibility==='gm'             ?'selected':''}>Только GM</option>
            <option value="role"   ${elData.visibility==='role'           ?'selected':''}>По роли</option>
            <option value="reveal" ${elData.visibility==='reveal'         ?'selected':''}>Скрыт / Reveal on click</option>
          </select>
          <div id="nwpc-vis-role-row" style="display:${elData.visibility==='role'?'block':'none'};margin-top:6px;">
            <label style="font-size:.72rem;color:#888;">Минимальная роль:</label>
            <select id="nwpc-vis-role" class="nwpc-prop-input" style="width:100%;">
              <option value="1" ${(elData.visibilityRole??1)===1?'selected':''}>Player</option>
              <option value="2" ${elData.visibilityRole===2?'selected':''}>Trusted</option>
              <option value="3" ${elData.visibilityRole===3?'selected':''}>Assistant</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // LISTENERS

    /* Аккордеон */
    panel.querySelectorAll('.nwpc-acc-hdr').forEach(hdr=>{
      hdr.addEventListener('click', ()=>{ hdr.parentElement.classList.toggle('open'); });
    });

    /* Геометрия */
    panel.querySelectorAll('.nwpc-geom').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const {w:cw,h:ch}=this._getCanvasSize();
        const f=inp.dataset.field; let val=Number(inp.value);
        if(f==='x') val=Math.max(0,Math.min(val,cw-elData.w));
        if(f==='y') val=Math.max(0,Math.min(val,ch-elData.h));
        if(f==='w') val=Math.max(20,Math.min(val,cw-elData.x));
        if(f==='h') val=Math.max(20,Math.min(val,ch-elData.y));
        elData[f]=val;
        const ee=html.querySelector(`[data-el-id="${id}"]`);
        if(ee) Object.assign(ee.style,{left:`${elData.x}px`,top:`${elData.y}px`,width:`${elData.w}px`,height:`${elData.h}px`});
        this._scheduleSave(html);
      });
    });

    /* Стили элемента */
    panel.querySelectorAll('.nwpc-style-inp').forEach(inp=>{
      const ev=(inp.type==='range'||inp.type==='checkbox'||inp.type==='color')?'input':'change';
      inp.addEventListener(ev, ()=>{
        if(!elData.style) elData.style={};
        const key=inp.dataset.skey;
        const val=inp.type==='checkbox'?inp.checked:(inp.type==='number'?Number(inp.value):inp.value);
        elData.style[key]=val;
        /* Live preview */
        const ee=html.querySelector(`[data-el-id="${id}"]`);
        const ec=ee?.querySelector('.nwpc-el-content');
        if(ee){
          if(key==='opacity')  { ee.style.opacity=val/100; const lbl=panel.querySelector('#opacity-lbl'); if(lbl) lbl.textContent=val+'%'; }
          if(key==='rotation') ee.style.transform=val?`rotate(${val}deg)`:'';
          if(key==='bgColor'&&ec)  ec.style.background=val||'';
          if((key==='borderWidth'||key==='borderStyle'||key==='borderColor')&&ec){
            const bw=elData.style.borderWidth||0, bs=elData.style.borderStyle||'solid', bc=elData.style.borderColor||'#000';
            ec.style.border=bw>0?`${bw}px ${bs} ${bc}`:'';
          }
          if(key==='borderRadius'&&ec) ec.style.borderRadius=val?val+'px':'';
          if(key==='shadow'&&ec) ec.style.boxShadow=val?'3px 3px 12px rgba(0,0,0,0.3)':'';
          /* Sync color previews */
          if(key==='bgColor'){
            const prevs=panel.querySelectorAll(`[data-skey="bgColor"] + .nwpc-color-preview, [data-skey="bgColor"]`);
            panel.querySelectorAll('.nwpc-style-inp[data-skey="bgColor"]').forEach(i=>{ if(i.type!=='color') return; });
            const prev=panel.querySelector(`.nwpc-color-swatch-btn:has([data-skey="bgColor"]) .nwpc-color-preview`);
            if(prev) prev.style.background=val||'transparent';
            const hex=panel.querySelector(`.nwpc-mini-inp[data-skey="bgColor"]`);
            if(hex&&inp!==hex) hex.value=val;
          }
        }
        this._scheduleSave(html,true);
      });
    });
    /* Сброс поворота */
    panel.querySelector('#nwpc-rot-reset')?.addEventListener('click', ()=>{ if(!elData.style) elData.style={}; elData.style.rotation=0; const inp=panel.querySelector('[data-skey="rotation"]'); if(inp) inp.value=0; const ee=html.querySelector(`[data-el-id="${id}"]`); if(ee) ee.style.transform=''; this._scheduleSave(html); });
    /* Сброс фона */
    panel.querySelector('.nwpc-clear-bgcolor')?.addEventListener('click', ()=>{ if(!elData.style) elData.style={}; elData.style.bgColor=''; const inp=panel.querySelector('.nwpc-mini-inp[data-skey="bgColor"]'); if(inp) inp.value=''; const ec=html.querySelector(`[data-el-id="${id}"] .nwpc-el-content`); if(ec) ec.style.background=''; this._scheduleSave(html); });

    /* Цвет текста */
    const tcI=panel.querySelector('#nwpc-text-color'), tcH=panel.querySelector('#nwpc-text-color-hex');
    if(tcI&&tcH){
      const updateTC=()=>{ tcH.value=tcI.value; elData.props.textColor=tcI.value; this._refreshElContent(html,id,elData); this._scheduleSave(html); };
      tcI.addEventListener('input', updateTC);
      tcH.addEventListener('change', ()=>{ if(/^#[0-9a-fA-F]{6}$/.test(tcH.value)){ tcI.value=tcH.value; updateTC(); } });
      panel.querySelector('#nwpc-text-color-reset')?.addEventListener('click', ()=>{ elData.props.textColor=''; tcI.value='#333333'; tcH.value=''; this._refreshElContent(html,id,elData); this._scheduleSave(html); });
    }

    /* data-prop inputs */
    panel.querySelectorAll('[data-prop]').forEach(inp=>{
      const ev=(inp.tagName==='SELECT'||inp.type==='checkbox'||inp.type==='color')?'change':'input';
      inp.addEventListener(ev, ()=>{
        const key=inp.dataset.prop;
        const val=inp.type==='checkbox'?inp.checked:(inp.type==='number'?Number(inp.value):inp.value);
        elData.props[key]=val;
        if(key==='scale'){ const lbl=panel.querySelector('#scale-label'); if(lbl) lbl.textContent=val+'%'; }
        if(key==='fontSize'||key==='fontUnit'||key==='fontFamily'||key==='fontWeight'||key==='lineHeight'||key==='letterSpacing'||key==='textTransform'||key==='textAlign'||key==='underline') this._refreshElContent(html,id,elData);
        else this._refreshElContent(html,id,elData);
        this._scheduleSave(html,true);
      });
    });

    /* Кнопки форматирования */
    panel.querySelectorAll('.nwpc-fmt-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const ta=panel.querySelector(`[data-prop="${btn.dataset.target}"]`); if(!ta) return;
        const {selectionStart:ss,selectionEnd:se,value:v}=ta;
        const sel=v.slice(ss,se)||'текст';
        const wrap=btn.dataset.wrap;
        ta.setRangeText(wrap+sel+wrap,ss,se,'select');
        ta.dispatchEvent(new Event('input'));
      });
    });

    /* Вставка даты */
    panel.querySelectorAll('.nwpc-ins-date-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const ta=panel.querySelector(`[data-prop="${btn.dataset.target}"]`); if(!ta) return;
        const d=new Date().toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});
        const ss=ta.selectionStart, se=ta.selectionEnd;
        ta.setRangeText(d,ss,se,'end');
        ta.dispatchEvent(new Event('input'));
      });
    });

    /* Счётчик слов */
    panel.querySelectorAll('[data-counter]').forEach(ta=>{
      const counter=panel.querySelector(`[data-counter-for="${ta.dataset.prop}"]`);
      const updateCount=()=>{
        if(!counter) return;
        const t=ta.value||''; const words=t.trim().split(/\s+/).filter(Boolean).length;
        counter.textContent=`${t.length} симв. / ${words} сл.`;
      };
      ta.addEventListener('input', updateCount); updateCount();
    });

    /* Выбор файла */
    panel.querySelector('#nwpc-pick-file-btn')?.addEventListener('click', ()=>this._pickLocalFile(elData,html,id));

    // actor-link buttons
    panel.querySelector('#nwpc-actor-refresh-btn')?.addEventListener('click', async()=>{
      const actor = await fromUuid(elData.props.actorUuid);
      if(!actor){ ui.notifications.warn('Актёр не найден.'); return; }
      if(elData.type==='image'){
        const freshUrl = await this._cropImage(actor.img);
        elData.props.url = freshUrl;
        const urlInp = panel.querySelector('[data-prop="url"]'); if(urlInp) urlInp.value = freshUrl;
      } else if(elData.type==='byline'){
        elData.props.text = actor.name;
        const txtInp = panel.querySelector('[data-prop="text"]'); if(txtInp) txtInp.value = actor.name;
      }
      this._refreshElContent(html,id,elData);
      this._scheduleSave(html);
      ui.notifications.info(`Данные "${actor.name}" обновлены.`);
    });
    panel.querySelector('#nwpc-actor-unlink-btn')?.addEventListener('click', ()=>{
      elData.props.actorUuid = undefined;
      const row = panel.querySelector('#nwpc-actor-link-row'); if(row) row.style.display='none';
      this._scheduleSave(html);
    });

    /* Порядок слоёв */
    panel.querySelector('.nwpc-props-to-front')?.addEventListener('click', ()=>{ const arr=this._getPageData().elements; const i=arr.findIndex(e=>e.id===id); if(i<arr.length-1){ arr.push(arr.splice(i,1)[0]); this._buildCanvas(html); this._selectElement(id,html); this._scheduleSave(html); } });
    panel.querySelector('.nwpc-props-to-back')?.addEventListener('click',  ()=>{ const arr=this._getPageData().elements; const i=arr.findIndex(e=>e.id===id); if(i>0){ arr.unshift(arr.splice(i,1)[0]); this._buildCanvas(html); this._selectElement(id,html); this._scheduleSave(html); } });

    /* Выравнивание в панели */
    panel.querySelectorAll('.nwpc-align-btn').forEach(btn=>btn.addEventListener('click', ()=>this._alignElement(btn.dataset.align,html)));

    /* Дублировать / Заблокировать / Удалить */
    panel.querySelector('.nwpc-props-dup-btn')?.addEventListener('click',  ()=>this._duplicateSelected(html));
    panel.querySelector('.nwpc-props-lock-btn')?.addEventListener('click', ()=>this._toggleLock(id,html));
    panel.querySelector('.nwpc-props-del-btn')?.addEventListener('click',  ()=>this._deleteSelected(html));

    /* color swatch click opens color input */
    panel.querySelectorAll('.nwpc-color-swatch-btn').forEach(sw=>sw.addEventListener('click', ()=>sw.querySelector('input[type="color"]')?.click()));

    /* text-align buttons */
    this._attachTextAlignListeners(panel, elData, html, id);

    // visibility controls
    const visSel = panel.querySelector('#nwpc-vis-mode');
    const visRoleRow = panel.querySelector('#nwpc-vis-role-row');
    const visRoleSel = panel.querySelector('#nwpc-vis-role');
    visSel?.addEventListener('change', ()=>{
      elData.visibility = visSel.value;
      if(visRoleRow) visRoleRow.style.display = visSel.value==='role'?'block':'none';
      /* Rebuild label badge */
      const labelEl = html.querySelector(`[data-el-id="${id}"] .nwpc-el-label`);
      if(labelEl) labelEl.innerHTML = `<i class="${EL_ICONS[elData.type]||'fas fa-square'}"></i>${EL_LABELS[elData.type]||elData.type}${
        elData.visibility==='gm'     ? ' <i class="fas fa-user-shield nwpc-vis-badge" style="color:#ff6b6b;"></i>'
        : elData.visibility==='role'   ? ' <i class="fas fa-users nwpc-vis-badge" style="color:#ffd93d;"></i>'
        : elData.visibility==='reveal' ? ' <i class="fas fa-question nwpc-vis-badge" style="color:#4a90d9;"></i>'
        : ''
      }`;
      this._scheduleSave(html,true);
    });
    visRoleSel?.addEventListener('change', ()=>{
      elData.visibilityRole = parseInt(visRoleSel.value);
      this._scheduleSave(html,true);
    });
  }

  // --- BUILD PROPS HTML BY TYPE ---

  _buildPropsHTML(elData){
    const p=elData.props||{};

    const ta=(key,val,rows=4,ph='')=>`<textarea data-prop="${key}" rows="${rows}" placeholder="${ph}" class="nwpc-prop-ta" data-counter="${key}">${val||''}</textarea><div class="nwpc-word-counter" data-counter-for="${key}"></div>`;
    const inp=(key,val,type='text',ph='',extra='')=>`<input data-prop="${key}" type="${type}" value="${val||''}" placeholder="${ph}" class="nwpc-prop-input" style="width:100%;" ${extra}>`;
    const num=(key,val,min,max,step=1)=>`<input data-prop="${key}" type="number" value="${val||0}" min="${min}" max="${max}" step="${step}" class="nwpc-prop-input" style="width:68px;">`;
    const chk=(key,val,lbl)=>`<label class="nwpc-chk-row"><input data-prop="${key}" type="checkbox" ${val?'checked':''}> ${lbl}</label>`;
    const sel=(key,opts,cur)=>`<select data-prop="${key}" class="nwpc-prop-input" style="width:100%;">${opts.map(o=>`<option value="${o.v}" ${cur===o.v?'selected':''}>${o.l}</option>`).join('')}</select>`;

    /* Форматирование-бар */
    const fmtBar=(target)=>`<div class="nwpc-fmt-bar">
      <button class="nwpc-fmt-btn" data-target="${target}" data-wrap="**"  title="Жирный"><i class="fas fa-bold"></i></button>
      <button class="nwpc-fmt-btn" data-target="${target}" data-wrap="*"   title="Курсив"><i class="fas fa-italic"></i></button>
      <button class="nwpc-fmt-btn" data-target="${target}" data-wrap="~~"  title="Зачёркн."><i class="fas fa-strikethrough"></i></button>
      <button class="nwpc-fmt-btn" data-target="${target}" data-wrap="__"  title="Подчёркн."><i class="fas fa-underline"></i></button>
      <span class="nwpc-fmt-sep"></span>
      <button class="nwpc-ins-date-btn" data-target="${target}" title="Вставить дату"><i class="fas fa-calendar-day"></i></button>
    </div>`;

    /* Строка шрифта */
    const fontRow=(keyFamily,keyWeight,curFamily,curWeight)=>`
      <div class="nwpc-font-row">
        <select data-prop="${keyFamily}" class="nwpc-prop-input" style="width:100%;margin-bottom:4px;">
          <option value="">— По умолчанию —</option>
          ${FONT_LIST.map(f=>`<option value="${f}" ${curFamily===f?'selected':''}>${f}</option>`).join('')}
        </select>
        <div style="display:flex;gap:6px;align-items:center;">
          <label style="font-size:.72rem;">Насыщенность</label>
          ${sel(keyWeight,[{v:'300',l:'Тонкий 300'},{v:'400',l:'Обычный 400'},{v:'600',l:'Полужирный 600'},{v:'700',l:'Жирный 700'},{v:'900',l:'Чёрный 900'}],curWeight||'400')}
        </div>
      </div>`;

    /* Строка размера + интерлиньяж + трекинг */
    const typographyRow=(keyFs,keyFu,keyLh,keyLs,keyTt,keyTa,fs,fu,lh,ls,tt,ta)=>`
      <div class="nwpc-typo-row">
        <div class="nwpc-typo-cell">
          <label>Кегль</label>
          <div style="display:flex;gap:3px;">
            ${num(keyFs,fs||14,1,300,1)}
            ${sel(keyFu,[{v:'px',l:'px'},{v:'pt',l:'pt'}],fu||'px')}
          </div>
        </div>
        <div class="nwpc-typo-cell">
          <label>Интерл.</label>
          ${num(keyLh,lh||1.6,0.8,4,0.1)}
        </div>
        <div class="nwpc-typo-cell">
          <label>Трекинг</label>
          ${num(keyLs,ls||0,-0.1,0.5,0.01)}
        </div>
      </div>
      <div class="nwpc-typo-row" style="margin-top:4px;">
        <div class="nwpc-typo-cell">
          <label>Трансформация</label>
          ${sel(keyTt,[{v:'none',l:'Обычный'},{v:'uppercase',l:'ЗАГЛАВНЫЕ'},{v:'lowercase',l:'строчные'},{v:'capitalize',l:'Каждое Слово'}],tt||'none')}
        </div>
        <div class="nwpc-typo-cell">
          <label>Выравнивание</label>
          <div class="nwpc-align-row">
            <button class="nwpc-fmt-btn nwpc-textalign-btn" data-prop-key="${keyTa}" data-val="left"    title="Влево"><i class="fas fa-align-left"></i></button>
            <button class="nwpc-fmt-btn nwpc-textalign-btn" data-prop-key="${keyTa}" data-val="center"  title="По центру"><i class="fas fa-align-center"></i></button>
            <button class="nwpc-fmt-btn nwpc-textalign-btn" data-prop-key="${keyTa}" data-val="right"   title="Вправо"><i class="fas fa-align-right"></i></button>
            <button class="nwpc-fmt-btn nwpc-textalign-btn" data-prop-key="${keyTa}" data-val="justify" title="По ширине"><i class="fas fa-align-justify"></i></button>
          </div>
        </div>
      </div>`;

    let html='';
    switch(elData.type){

      case 'masthead':
        html=`
          <div class="nwpc-prop-group">
            <label>Строка 1 (название)</label>${inp('line1',p.line1,'text','The Kingdom Times')}
            <label>Строка 2</label>${inp('line2',p.line2,'text','Подзаголовок')}
            <label>Девиз</label>${inp('motto',p.motto,'text','"Девиз газеты"')}
            <label>Стиль</label>
            ${sel('style',[{v:'classic',l:'Классика'},{v:'gothic',l:'Готика'},{v:'luxury',l:'Люкс'},{v:'rustic',l:'Рустик'}],p.style||'classic')}
          </div>`;
        break;

      case 'headline':
        html=`
          <div class="nwpc-prop-group">
            <label>Текст</label>
            ${fmtBar('text')}
            ${ta('text',p.text,2,'Заголовок...')}
          </div>
          <div class="nwpc-prop-group">
            ${fontRow('fontFamily','fontWeight',p.fontFamily||'',p.fontWeight||'700')}
            ${typographyRow('fontSize','fontUnit','lineHeight','letterSpacing','textTransform','textAlign',p.fontSize||32,p.fontUnit||'px',p.lineHeight||1.1,p.letterSpacing||0,p.textTransform||'none',p.textAlign||'left')}
          </div>`;
        break;

      case 'body':
        html=`
          <div class="nwpc-prop-group">
            <label>Текст <span class="nwpc-hint">↵ = новый абзац · **жирный** · *курсив* · ~~зачёрк.~~ · __подчёрк.__</span></label>
            ${fmtBar('text')}
            ${ta('text',p.text,9,'Текст статьи...')}
            <div class="nwpc-body-opts">
              <label>Колонки:</label>${num('columns',p.columns||1,1,4)}
              ${chk('dropCap',p.dropCap,'Буквица')}
            </div>
          </div>
          <div class="nwpc-prop-group">
            ${fontRow('fontFamily','fontWeight',p.fontFamily||'',p.fontWeight||'400')}
            ${typographyRow('fontSize','fontUnit','lineHeight','letterSpacing','textTransform','textAlign',p.fontSize||13,p.fontUnit||'px',p.lineHeight||1.7,p.letterSpacing||0,p.textTransform||'none',p.textAlign||'justify')}
          </div>`;
        break;

      case 'image':
        html=`
          <div class="nwpc-prop-group">
            <label>URL изображения</label>${inp('url',p.url,'text','https://...')}
            <button id="nwpc-pick-file-btn" class="nwpc-sm-btn" style="margin-top:5px;width:100%;"><i class="fas fa-folder-open"></i> Выбрать файл...</button>
            <label style="margin-top:8px;">Подпись</label>${inp('caption',p.caption,'text','Подпись к фото...')}
            <label style="margin-top:8px;">Масштаб: <span id="scale-label">${p.scale??100}%</span></label>
            <input data-prop="scale" type="range" min="10" max="200" value="${p.scale??100}" style="width:100%;margin-top:3px;">
            <label style="margin-top:8px;">Стиль рамки</label>
            <select data-prop="imageFrameStyle" class="nwpc-prop-input" style="width:100%;">
              <option value="none" ${(!p.imageFrameStyle||p.imageFrameStyle==='none')?'selected':''}>— Без рамки —</option>
              ${IMG_FRAME_CATS.map(({cat,styles})=>`<optgroup label="${cat}">${styles.map(st=>`<option value="${st.id}" ${p.imageFrameStyle===st.id?'selected':''}>${st.label}</option>`).join('')}</optgroup>`).join('')}
            </select>
            <label style="display:flex;align-items:center;gap:6px;margin-top:8px;"><input data-prop="objectFit" type="checkbox" ${p.objectFit==='cover'?'checked':''}> Обрезать (cover)</label>
            <div id="nwpc-actor-link-row" style="margin-top:8px;display:${p.actorUuid?'block':'none'};">
              <div style="font-size:.72rem;color:#888;margin-bottom:4px;"><i class="fas fa-link"></i> Связан с актёром</div>
              <div style="display:flex;gap:4px;">
                <button id="nwpc-actor-refresh-btn" class="nwpc-sm-btn" style="flex:1;"><i class="fas fa-sync"></i> Обновить портрет</button>
                <button id="nwpc-actor-unlink-btn" class="nwpc-sm-btn" style="color:#f88;"><i class="fas fa-unlink"></i></button>
              </div>
            </div>
          </div>`;
        break;

      case 'rule':
        html=`
          <div class="nwpc-prop-group">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <label>Толщина ${num('thickness',p.thickness||2,1,12)}</label>
              <label>Цвет <input data-prop="color" type="color" value="${p.color||'#1a1a1a'}" style="margin-left:4px;height:26px;width:44px;vertical-align:middle;"></label>
            </div>
            <label style="margin-top:8px;">Стиль</label>
            ${sel('style',[{v:'solid',l:'Сплошная'},{v:'double',l:'Двойная'},{v:'dashed',l:'Штриховая'},{v:'dotted',l:'Точечная'}],p.style||'solid')}
          </div>`;
        break;

      case 'quote':
        html=`
          <div class="nwpc-prop-group">
            <label>Цитата</label>${fmtBar('text')}${ta('text',p.text,3,'Цитата...')}
            <label>Автор</label>${inp('author',p.author,'text','— Автор')}
          </div>
          <div class="nwpc-prop-group">
            ${fontRow('fontFamily','fontWeight',p.fontFamily||'Playfair Display',p.fontWeight||'400')}
            ${typographyRow('fontSize','fontUnit','lineHeight','letterSpacing','textTransform','textAlign',p.fontSize||14,p.fontUnit||'px',p.lineHeight||1.5,p.letterSpacing||0,p.textTransform||'none',p.textAlign||'left')}
          </div>`;
        break;

      case 'box':
        html=`
          <div class="nwpc-prop-group">
            <label>Заголовок</label>${fmtBar('title')}${inp('title',p.title,'text','Заголовок блока')}
            <label style="margin-top:6px;">Текст</label>${fmtBar('text')}${ta('text',p.text,4,'Текст...')}
            ${chk('border',p.border,'Показать рамку блока')}
          </div>
          <div class="nwpc-prop-group">
            ${fontRow('fontFamily','fontWeight',p.fontFamily||'',p.fontWeight||'400')}
            ${typographyRow('fontSize','fontUnit','lineHeight','letterSpacing','textTransform','textAlign',p.fontSize||12,p.fontUnit||'px',p.lineHeight||1.6,p.letterSpacing||0,p.textTransform||'none',p.textAlign||'left')}
          </div>`;
        break;

      case 'ad':
        html=`
          <div class="nwpc-prop-group">
            <label>Заголовок</label>${inp('title',p.title,'text','ОБЪЯВЛЕНИЕ')}
            <label style="margin-top:6px;">Текст</label>${ta('text',p.text,3,'Текст объявления...')}
          </div>`;
        break;

      case 'byline':
        html=`
          <div class="nwpc-prop-group">
            <label>Подпись автора</label>${inp('text',p.text,'text','Корреспондент: ...')}
            <div id="nwpc-actor-link-row" style="margin-top:8px;display:${p.actorUuid?'block':'none'};">
              <div style="font-size:.72rem;color:#888;margin-bottom:4px;"><i class="fas fa-link"></i> Связан с актёром</div>
              <div style="display:flex;gap:4px;">
                <button id="nwpc-actor-refresh-btn" class="nwpc-sm-btn" style="flex:1;"><i class="fas fa-sync"></i> Обновить имя</button>
                <button id="nwpc-actor-unlink-btn" class="nwpc-sm-btn" style="color:#f88;"><i class="fas fa-unlink"></i></button>
              </div>
            </div>
          </div>`;
        break;

      default: html='<p class="nwpc-ph">Нет настроек</p>';
    }

    /* Сразу навешиваем слушатели на кнопки выравнивания текста */
    return html + `<script type="noop" id="nwpc-ta-align-marker"></script>`;
  }

  /* ПОСЛЕ того как innerHTML выставлен, вызывается отдельно */
  _attachTextAlignListeners(panel, elData, html, id){
    panel.querySelectorAll('.nwpc-textalign-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key=btn.dataset.propKey; const val=btn.dataset.val;
        elData.props[key]=val;
        panel.querySelectorAll(`.nwpc-textalign-btn[data-prop-key="${key}"]`).forEach(b=>b.classList.toggle('active',b.dataset.val===val));
        this._refreshElContent(html,id,elData);
        this._scheduleSave(html);
      });
      /* Синхронизация активной кнопки */
      const key=btn.dataset.propKey;
      const cur=elData.props[key]||'left';
      btn.classList.toggle('active',btn.dataset.val===cur);
    });
  }

  // --- RENDER ELEMENT HTML ---

  _renderElHTML(el){
    // Делегируем в шаренный рендерер из newspaper.mjs
    // Для редактора добавляем placeholder-тексты когда поля пустые
    const p = el.props || {};
    const withPlaceholders = structuredClone ? structuredClone(el) : JSON.parse(JSON.stringify(el));
    const pp = withPlaceholders.props;
    if (el.type === 'masthead' && !p.line1 && !p.line2) {
      pp.line1 = 'Шапка газеты...'; pp._isPlaceholder = true;
    }
    if (el.type === 'headline' && !p.text) pp.text = 'Заголовок...';
    if (el.type === 'body'     && !p.text) pp.text = 'Текст статьи...';
    if (el.type === 'quote'    && !p.text) pp.text = 'Цитата...';
    if (el.type === 'box'      && !p.text) pp.text = 'Текст...';
    if (el.type === 'byline'   && !p.text) pp.text = 'Корреспондент...';
    if (el.type === 'image'    && !p.url) {
      return `<div class="nwpc-img-ph"><i class="fas fa-image"></i><span>Изображение</span></div>`;
    }
    return renderElementHTML(withPlaceholders);
  }

  _refreshElContent(html,id,elData){
    const c=html.querySelector(`[data-el-id="${id}"] .nwpc-el-content`);
    if(c) c.innerHTML=this._renderElHTML(elData);
    /* Обновить кастомные стили */
    const s=elData.style||{};
    if(s.bgColor)      c.style.background=s.bgColor;
    if(s.borderWidth>0) c.style.border=`${s.borderWidth}px ${s.borderStyle||'solid'} ${s.borderColor||'#000'}`;
    if(s.borderRadius)  c.style.borderRadius=s.borderRadius+'px';
    if(s.shadow)        c.style.boxShadow='3px 3px 12px rgba(0,0,0,0.3)';
  }

  // --- ALIGN ---

  _alignElement(align, html){
    if(!this._selectedId) return;
    const page=this._getPageData();
    const el=page.elements.find(e=>e.id===this._selectedId); if(!el) return;
    const {w,h}=this._getCanvasSize(page);
    if(align==='left')    el.x=0;
    if(align==='hcenter') el.x=Math.round((w-el.w)/2);
    if(align==='right')   el.x=w-el.w;
    if(align==='top')     el.y=0;
    if(align==='vcenter') el.y=Math.round((h-el.h)/2);
    if(align==='bottom')  el.y=h-el.h;
    const div=html.querySelector(`[data-el-id="${this._selectedId}"]`);
    if(div){ div.style.left=el.x+'px'; div.style.top=el.y+'px'; }
    this._updateGeomInputs(html,el);
    this._pushHistory(); this._scheduleSave(html);
  }

  _updateAlignGroup(html){
    const grp=html.querySelector('#ed-align-group');
    if(!grp) return;
    grp.style.opacity=this._selectedId?'1':'0.35';
    grp.style.pointerEvents=this._selectedId?'auto':'none';
  }

  // --- ELEMENT ACTIONS ---

  async _addElement(type,html){
    const page=this._getPageData(); const def=ELEMENT_DEFAULTS[type]; if(!def) return;
    const {w,h}=this._getCanvasSize(page);
    const same=page.elements.filter(e=>e.type===type).length;
    const newEl={
      id:`el_${type}_${Date.now()}`,
      type:def.type,
      x:Math.min(w-def.w,def.x+same*20),
      y:Math.min(h-def.h,def.y+same*20),
      w:Math.min(def.w,w),
      h:Math.min(def.h,h),
      props:JSON.parse(JSON.stringify(def.props)),
      style:{},
    };
    page.elements.push(newEl);
    await this._savePageData(page); this._pushHistory();
    this._buildCanvas(html); this._selectElement(newEl.id,html);
  }

  async _duplicateSelected(html){
    if(!this._selectedId) return;
    const page=this._getPageData();
    const src=page.elements.find(e=>e.id===this._selectedId); if(!src) return;
    const dup=JSON.parse(JSON.stringify(src));
    dup.id=`el_${dup.type}_${Date.now()}`;
    dup.x=Math.min(dup.x+20,this._getCanvasSize(page).w-dup.w);
    dup.y=Math.min(dup.y+20,this._getCanvasSize(page).h-dup.h);
    page.elements.push(dup);
    await this._savePageData(page); this._pushHistory();
    this._buildCanvas(html); this._selectElement(dup.id,html);
    ui.notifications.info('Элемент дублирован!');
  }

  _toggleLock(id,html){
    if(this._lockedIds.has(id)) this._lockedIds.delete(id);
    else this._lockedIds.add(id);
    this._buildCanvas(html); this._selectElement(id,html);
  }

  async _deleteSelected(html){
    if(!this._selectedId) return;
    const ok=await this._confirm('Удалить элемент?','Это действие нельзя отменить.');
    if(!ok) return;
    const page=this._getPageData(); const i=page.elements.findIndex(e=>e.id===this._selectedId);
    if(i>=0) page.elements.splice(i,1);
    this._selectedId=null;
    await this._savePageData(page); this._pushHistory();
    this._buildCanvas(html); this._showPropsEmpty(html);
  }

  // --- ZOOM / FIT ---

  _applyZoom(html){
    const canvas=html.querySelector('#nwpc-canvas'); if(!canvas) return;
    const {w,h}=this._getCanvasSize();
    canvas.style.transform=`scale(${this._zoom})`;
    canvas.style.transformOrigin='top left';
    const outer=html.querySelector('.nwpc-canvas-outer');
    if(outer){ outer.style.width=Math.ceil(w*this._zoom+24)+'px'; outer.style.height=Math.ceil(h*this._zoom+24)+'px'; outer.style.flexShrink='0'; }
    const lbl=html.querySelector('#ed-zoom-label'); if(lbl) lbl.textContent=Math.round(this._zoom*100)+'%';
  }

  _autoFitZoom(html){
    const wrap=html.querySelector('.nwpc-canvas-wrap'); if(!wrap) return;
    const {w,h}=this._getCanvasSize();
    const avW=wrap.clientWidth-48, avH=wrap.clientHeight-48;
    this._zoom=Math.max(0.1,Math.min(1.5,avW>0?Math.min(avW/w,avH>0?avH/h:99):1));
    this._applyZoom(html);
  }

  // --- UNDO / REDO ---

  _pushHistory(){
    const snap=JSON.parse(JSON.stringify(this._getPageData()));
    this._history=this._history.slice(0,this._historyIdx+1);
    this._history.push(snap);
    if(this._history.length>this._maxHistory) this._history.shift();
    else this._historyIdx++;
    const html=this.element; if(html){ this._updateUndoRedoBtns(html); this._updateStatusBar(html); }
  }

  async _undo(html){
    if(this._historyIdx<=0){ ui.notifications.info('Нечего отменять'); return; }
    this._historyIdx--;
    await this._savePageData(this._history[this._historyIdx]);
    this._selectedId=null; this._buildCanvas(html); this._showPropsEmpty(html); this._applyZoom(html);
    this._updateUndoRedoBtns(html); this._updateStatusBar(html);
  }

  async _redo(html){
    if(this._historyIdx>=this._history.length-1){ ui.notifications.info('Нечего повторять'); return; }
    this._historyIdx++;
    await this._savePageData(this._history[this._historyIdx]);
    this._selectedId=null; this._buildCanvas(html); this._showPropsEmpty(html); this._applyZoom(html);
    this._updateUndoRedoBtns(html); this._updateStatusBar(html);
  }

  _updateUndoRedoBtns(html){
    const ub=html?.querySelector('#ed-undo-btn'), rb=html?.querySelector('#ed-redo-btn');
    if(ub) ub.disabled=this._historyIdx<=0;
    if(rb) rb.disabled=this._historyIdx>=this._history.length-1;
  }

  // --- STATUS BAR ---

  _updateStatusBar(html){
    const page=this._getPageData();
    const {w,h}=this._getCanvasSize(page);
    const selEl=this._selectedId?page.elements.find(e=>e.id===this._selectedId):null;
    const sb_el=html?.querySelector('#sb-elements'); if(sb_el) sb_el.textContent=`Элементов: ${(page.elements||[]).length}`;
    const sb_sz=html?.querySelector('#sb-page-size'); if(sb_sz) sb_sz.textContent=`${page.pageSize||'A4'}  ${w}×${h}px`;
    const sb_sel=html?.querySelector('#sb-selected'); if(sb_sel) sb_sel.textContent=selEl?`${EL_LABELS[selEl.type]||selEl.type}  x:${selEl.x} y:${selEl.y} w:${selEl.w} h:${selEl.h}`:'';
    const sb_hist=html?.querySelector('#sb-history'); if(sb_hist) sb_hist.textContent=`Шагов: ${this._historyIdx+1}/${this._history.length}`;
  }

  _updateCursorCoords(e,html){
    const canvas=html.querySelector('#nwpc-canvas'); if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const x=Math.round((e.clientX-rect.left)/this._zoom);
    const y=Math.round((e.clientY-rect.top)/this._zoom);
    this._updateCursorPos(html,x,y);
  }
  _updateCursorPos(html,x,y){
    const sb=html?.querySelector('#sb-cursor'); if(sb) sb.textContent=`X: ${x}  Y: ${y}`;
  }

  _updateGeomInputs(html,elData){
    const panel=html?.querySelector('#nwpc-props'); if(!panel) return;
    ['x','y','w','h'].forEach(f=>{ const inp=panel.querySelector(`.nwpc-geom[data-field="${f}"]`); if(inp) inp.value=elData[f]; });
    this._updateStatusBar(html);
  }

  // --- TOOLBAR SYNC ---

  _syncToolbarToPage(html){
    const p=this._getPageData();
    const set=(id,val)=>{ const el=html.querySelector(`#${id}`); if(el) el.value=val; };
    set('ed-paper-style', p.paperStyle||'classic');
    set('ed-orientation', p.orientation||'portrait');
    set('ed-page-size',   p.pageSize||'A4');
    set('ed-custom-w',    p.customW||794);
    set('ed-custom-h',    p.customH||1123);
    const cw=html.querySelector('#ed-custom-size-wrap'); if(cw) cw.style.display=p.pageSize==='custom'?'flex':'none';
    const cInp=html.querySelector('#ed-paper-color'), cHex=html.querySelector('#ed-paper-color-hex'), cPrev=html.querySelector('#ed-paper-color-preview');
    if(cInp){ cInp.value=p.paperColor||'#f4f1ea'; if(cHex) cHex.value=p.paperColor||''; if(cPrev) cPrev.style.background=p.paperColor||'#f4f1ea'; }
  }

  // --- PAGE ACTIONS ---

  async _addPage(html){
    const cur=this._getPageData();
    const ok=await LiveNewspaper.addPage(cur.paperStyle,cur.pageSize); if(!ok) return;
    const d=LiveNewspaper.getData(); const np=d.pages[d.pages.length-1];
    Object.assign(np,{paperStyle:cur.paperStyle,pageSize:cur.pageSize,orientation:cur.orientation,customW:cur.customW,customH:cur.customH,elements:[]});
    await LiveNewspaper.setPage(d.pages.length-1,np);
    this._currentPage=d.pages.length-1; this.render({force:true});
  }

  async _removePage(html){
    const ok=await this._confirm('Удалить страницу?','Страница будет удалена безвозвратно.'); if(!ok) return;
    await LiveNewspaper.removePage(this._currentPage); this.render({force:true});
  }

  async _onPageSizeChange(size,html){
    const p=this._getPageData(); p.pageSize=size;
    if(size!=='custom'){ const sz=PAGE_SIZES[size]; p.customW=sz.w; p.customH=sz.h; }
    const cw=html.querySelector('#ed-custom-size-wrap'); if(cw) cw.style.display=size==='custom'?'flex':'none';
    await this._savePageData(p); this._buildCanvas(html); this._autoFitZoom(html);
  }

  async _onStyleChange(style,html){
    const p=this._getPageData(); p.paperStyle=style;
    /* FIX: Always keep A4 (794×1123) when switching styles.
     * Previously loadPaperImageSize() applied the webp pixel dimensions
     * (e.g. 677×956 for Grunge) which broke the layout. */
    if(p.pageSize !== 'custom'){
      const sz = PAGE_SIZES[p.pageSize] || PAGE_SIZES.A4;
      p.customW = sz.w; p.customH = sz.h;
    }
    const canvas=html.querySelector('#nwpc-canvas');
    if(canvas){ canvas.className=`nwpc-paper nwpc-paper-${style}`; canvas.id='nwpc-canvas'; this._applyCanvasStyle(canvas,p); }
    await this._savePageData(p); this._buildCanvas(html); this._autoFitZoom(html);
  }

  // --- TABS ---

  _renderTab(html){
    html.querySelectorAll('.ed-tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===this._tab));
    const ca=html.querySelector('.nwpc-main'), la=html.querySelector('#ed-list-area'); if(!la) return;
    if(this._tab==='canvas'){ if(ca) ca.style.display='flex'; la.style.display='none'; }
    else{ if(ca) ca.style.display='none'; la.style.display='flex'; this._tab==='drafts'?this._renderDraftList(la):this._renderArchiveList(la); }
  }

  async _renderDraftList(container){
    let dr=LiveNewspaper.getDraft(); if(!dr||!Array.isArray(dr.pages)) dr={pages:[]};
    container.innerHTML=`<div class="ed-list-panel"><div class="ed-list-header"><i class="fas fa-pencil-alt"></i> Черновики</div>
      ${dr.pages.length===0?'<p class="nwpc-ph" style="padding:20px;">Нет черновиков</p>':''}
      ${dr.pages.map(e=>`<div class="ed-list-entry">
        <div class="ed-list-entry-info"><div class="ed-list-entry-name">${e.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><div class="ed-list-entry-date">${new Date(e.date).toLocaleString('ru')}</div></div>
        <div class="ed-list-entry-actions">
          <button class="nwpc-sm-btn ed-draft-restore-btn" data-id="${e.id}"><i class="fas fa-undo"></i> Восстановить</button>
          <button class="nwpc-sm-btn ed-draft-del-btn" data-id="${e.id}" style="color:#f88;"><i class="fas fa-trash"></i></button>
        </div></div>`).join('')}</div>`;
    container.querySelectorAll('.ed-draft-restore-btn').forEach(btn=>btn.addEventListener('click', async()=>{
      let dr2=LiveNewspaper.getDraft(); if(!Array.isArray(dr2?.pages)) dr2={pages:[]};
      const entry=dr2.pages.find(e=>e.id===btn.dataset.id); if(!entry) return;
      await LiveNewspaper.setPage(this._currentPage,entry.pageData); this._pushHistory();
      ui.notifications.info('Черновик восстановлен!'); this._tab='canvas'; this.render({force:true});
    }));
    container.querySelectorAll('.ed-draft-del-btn').forEach(btn=>btn.addEventListener('click', async()=>{
      const ok=await this._confirm('Удалить черновик?',''); if(!ok) return;
      await LiveNewspaper.deleteDraft(btn.dataset.id); this._renderDraftList(container);
    }));
  }

  async _renderArchiveList(container){
    let ar=LiveNewspaper.getArchive(); if(!ar||!Array.isArray(ar.entries)) ar={entries:[]};
    container.innerHTML=`<div class="ed-list-panel"><div class="ed-list-header"><i class="fas fa-archive"></i> Архив</div>
      ${ar.entries.length===0?'<p class="nwpc-ph" style="padding:20px;">Архив пуст</p>':''}
      ${ar.entries.map(e=>`<div class="ed-list-entry">
        <div class="ed-list-entry-info"><div class="ed-list-entry-name">${e.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><div class="ed-list-entry-date">${new Date(e.date).toLocaleString('ru')}</div></div>
        <div class="ed-list-entry-actions">
          <button class="nwpc-sm-btn ed-arc-restore-btn" data-id="${e.id}"><i class="fas fa-undo"></i> Разархивировать</button>
          <button class="nwpc-sm-btn ed-arc-del-btn" data-id="${e.id}" style="color:#f88;"><i class="fas fa-trash"></i></button>
        </div></div>`).join('')}</div>`;
    container.querySelectorAll('.ed-arc-restore-btn').forEach(btn=>btn.addEventListener('click', async()=>{
      const idx=await LiveNewspaper.restoreArchive(btn.dataset.id); if(idx===false){ ui.notifications.warn('Не найдено.'); return; }
      this._pushHistory(); ui.notifications.info('Восстановлено!'); this._currentPage=idx; this._tab='canvas'; this.render({force:true});
    }));
    container.querySelectorAll('.ed-arc-del-btn').forEach(btn=>btn.addEventListener('click', async()=>{
      const ok=await this._confirm('Удалить из архива?','Нельзя отменить.'); if(!ok) return;
      await LiveNewspaper.deleteArchive(btn.dataset.id); this._renderArchiveList(container);
    }));
  }

  // --- SAVE / DRAFT / PUBLISH ---

  async _save(html,silent=false){
    if(!LiveNewspaper.canDo('Edit')){ if(!silent) ui.notifications.warn('Недостаточно прав.'); return; }
    await this._savePageData(this._getPageData());
    this._lastSaveTs = Date.now();
    await LiveNewspaper.saveAutoDraft(this._currentPage, this._getPageData());
    this._updateSaveIndicator(html ?? this.element);
    if(!silent){ ui.notifications.info('Сохранено!'); }
  }

  async _savePageData(page){ await LiveNewspaper.setPage(this._currentPage,page); }

  // --- AUTO-SAVE INDICATOR ---

  _updateSaveIndicator(html){
    const badge = html?.querySelector('#ed-autosave-badge');
    const restoreBtn = html?.querySelector('#ed-autosave-restore');
    if(!badge) return;
    if(!this._lastSaveTs){ badge.textContent=''; return; }
    const secs = Math.round((Date.now() - this._lastSaveTs) / 1000);
    if(secs < 5)        badge.textContent = '✓ Только что сохранено';
    else if(secs < 60)  badge.textContent = `✓ Сохранено ${secs} сек. назад`;
    else if(secs < 3600){ const m=Math.floor(secs/60); badge.textContent=`✓ Сохранено ${m} мин. назад`; }
    else                badge.textContent = '✓ Сохранено давно';
    if(restoreBtn) restoreBtn.style.display = 'inline-flex';
  }

  _startSaveTicker(html){
    this._stopSaveTicker();
    this._saveTicker = setInterval(()=>this._updateSaveIndicator(html ?? this.element), 5000);
  }

  _stopSaveTicker(){
    if(this._saveTicker){ clearInterval(this._saveTicker); this._saveTicker=null; }
  }

  async _restoreAutoDraft(html){
    const entry = LiveNewspaper.getAutoDraft();
    if(!entry || !entry.pageData){ ui.notifications.warn('Автосохранение не найдено.'); return; }
    const ok = await this._confirm('Восстановить автосохранение?', `Дата сохранения: ${new Date(entry.date).toLocaleString('ru')}. Текущая страница будет перезаписана.`);
    if(!ok) return;
    await LiveNewspaper.setPage(this._currentPage, entry.pageData);
    this._pushHistory();
    this._selectedId = null;
    this._buildCanvas(html); this._showPropsEmpty(html);
    ui.notifications.info('Автосохранение восстановлено!');
  }

  async _saveDraft(html){
    const name=await this._askName(`Черновик ${new Date().toLocaleDateString('ru')}`); if(name===null) return;
    const page=this._getPageData();
    await LiveNewspaper.setPage(this._currentPage,page);
    await LiveNewspaper.saveDraft(this._currentPage,page,name||`Черновик ${new Date().toLocaleDateString('ru')}`);
    ui.notifications.info('Черновик сохранён!');
  }

  async _publish(html){
    if(!LiveNewspaper.canDo('Publish')){ ui.notifications.warn('Недостаточно прав.'); return; }

    // Предупреждение перед публикацией — это необратимое действие
    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize('cmt.publish.confirmTitle') },
      content: `<p>${game.i18n.localize('cmt.publish.confirmBody')}</p>`,
    });
    if (!confirmed) return;

    await this._save(html, true);
    /* Расширенный диалог публикации */
    const page=this._getPageData();
    const mast=page.elements?.find(e=>e.type==='masthead');
    const defaultTitle=(mast?`${mast.props.line1||''} ${mast.props.line2||''}`.trim():'The Kingdom Times')||'The Kingdom Times';

    /* Экранирование для вставки в HTML-атрибуты и текстовые узлы */
    const esc = s => String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const dlg=new foundry.applications.api.DialogV2({
      window:{title:'Выпустить газету',icon:'fas fa-paper-plane'},
      content:`<div style="padding:8px;display:flex;flex-direction:column;gap:10px;">
        <div class="nwpc-pub-preview" style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:12px;font-size:.8rem;">
          <div style="color:#c9a84c;font-weight:700;margin-bottom:6px;"><i class="fas fa-newspaper"></i> Предпросмотр сообщения</div>
          <div style="background:#fdf8f0;border:1px solid #c9a84c;padding:10px;border-radius:3px;color:#333;font-family:'Georgia',serif;">
            <div style="font-weight:bold;font-size:1em;color:#8b2e2e;" id="pub-prev-title">📰 ${esc(defaultTitle)}</div>
            <div id="pub-prev-desc" style="color:#444;margin-top:4px;font-size:.85em;">Свежий выпуск доступен.</div>
            <button disabled style="margin-top:8px;padding:4px 12px;background:#8b2e2e;color:#fff;border:none;border-radius:2px;font-size:.8em;" id="pub-prev-btn">📖 Открыть газету</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <label style="font-size:.75rem;color:#aaa;display:block;margin-bottom:3px;">Заголовок</label>
            <input id="pub-title" type="text" value="${esc(defaultTitle)}" style="width:100%;padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;box-sizing:border-box;" placeholder="Название газеты">
          </div>
          <div>
            <label style="font-size:.75rem;color:#aaa;display:block;margin-bottom:3px;">Текст кнопки</label>
            <input id="pub-btntext" type="text" value="📖 Открыть газету" style="width:100%;padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;box-sizing:border-box;">
          </div>
        </div>
        <div>
          <label style="font-size:.75rem;color:#aaa;display:block;margin-bottom:3px;">Описание</label>
          <input id="pub-desc" type="text" value="Свежий выпуск доступен для чтения." style="width:100%;padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;box-sizing:border-box;">
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:.75rem;color:#aaa;">Получатели:</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:.8rem;color:#ddd;"><input type="radio" name="pub-target" value="all" checked> Все</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:.8rem;color:#ddd;"><input type="radio" name="pub-target" value="players"> Только игроки</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:.8rem;color:#ddd;"><input type="radio" name="pub-target" value="gm"> Только GM</label>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:#ddd;"><input type="checkbox" id="pub-archive" checked> Сохранить в архив</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:#ddd;"><input type="checkbox" id="pub-sound"> Звуковое уведомление</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:#ddd;"><input type="checkbox" id="pub-journal"> Сохранить в Журнал кампании</label>
        </div>
      </div>`,
      buttons:[
        {
          action: 'publish',
          label: 'Выпустить!',
          icon: 'fas fa-paper-plane',
          default: true,
          className: 'dialog-button-primary',
          /* ВАЖНО: callback вызывается пока dlg.element ещё жив —
             в отличие от close-события, где element уже null        */
          callback: async (event, button, dialog) => {
            const root = dialog.element;
            const title    = root?.querySelector('#pub-title')?.value    || defaultTitle;
            const desc     = root?.querySelector('#pub-desc')?.value     || 'Свежий выпуск доступен.';
            const btnText  = root?.querySelector('#pub-btntext')?.value  || '📖 Открыть газету';
            const target   = root?.querySelector('input[name="pub-target"]:checked')?.value || 'all';
            const doArchive= root?.querySelector('#pub-archive')?.checked ?? true;
            const doSound  = root?.querySelector('#pub-sound')?.checked  ?? false;
            const doJournal= root?.querySelector('#pub-journal')?.checked ?? false;

            if(doArchive){
              const name=await this._askName(`Выпуск ${new Date().toLocaleDateString('ru')}`);
              if(name!==null) await LiveNewspaper.archivePage(this._getPageData(), name||`Выпуск ${new Date().toLocaleDateString('ru')}`);
            }

            if(doJournal) await this._publishToJournal(this._getPageData(), title);

            /* Отправка в чат */
            const whisper = target==='players'
              ? game.users.filter(u=>!u.isGM).map(u=>u.id)
              : target==='gm'
                ? game.users.filter(u=>u.isGM).map(u=>u.id)
                : null;

            await ChatMessage.create({
              content:`<div style="font-family:'Georgia',serif;border:1px solid #8b2e2e;padding:12px;background:#fdf8f0;border-radius:4px;max-width:380px;">
                <div style="font-weight:bold;font-size:1.05em;color:#8b2e2e;">📰 ${esc(title)}</div>
                <div style="color:#444;margin-top:5px;font-size:.88em;">${esc(desc)}</div>
                <button class="cmt-open-newspaper-btn" style="margin-top:10px;padding:5px 14px;background:#8b2e2e;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:inherit;font-size:.82em;">${esc(btnText)}</button>
              </div>`,
              speaker:{alias:'Редакция'},
              whisper,
            });

            if(doSound) foundry.audio.AudioHelper.play({src:'modules/campaign-master-tools/sounds/notify.mp3',volume:0.125,autoplay:true,loop:false},true);
            ui.notifications.info('Газета выпущена!');
          },
        },
        { action:'cancel', label:'Отмена', icon:'fas fa-times' },
      ],
    });

    dlg.addEventListener('render', ()=>{
      const root=dlg.element; if(!root) return;
      /* Живое обновление превью */
      const titleInp=root.querySelector('#pub-title'), descInp=root.querySelector('#pub-desc'), btnInp=root.querySelector('#pub-btntext');
      const prevTitle=root.querySelector('#pub-prev-title'), prevDesc=root.querySelector('#pub-prev-desc'), prevBtn=root.querySelector('#pub-prev-btn');
      const update=()=>{
        if(prevTitle) prevTitle.textContent='📰 '+(titleInp?.value||'Газета');
        if(prevDesc)  prevDesc.textContent=descInp?.value||'';
        if(prevBtn)   prevBtn.textContent=btnInp?.value||'Открыть';
      };
      titleInp?.addEventListener('input',update); descInp?.addEventListener('input',update); btnInp?.addEventListener('input',update);
    });

    dlg.render(true);
  }

  // --- HELPERS ---

  async _openViewer(html){
    await this._save(html,true);
    const app=foundry.applications.instances.get('cmt-news-viewer');
    if(app) app.render({force:true});
    else { const {NewsViewerApp}=await import('./news-viewer.mjs'); new NewsViewerApp().render(true); }
  }

  _pickLocalFile(elData,html,id){
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.display='none';
    document.body.appendChild(input);
    input.addEventListener('change', e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{ elData.props.url=ev.target.result; this._refreshElContent(html,id,elData); const u=html.querySelector('#nwpc-props input[data-prop="url"]'); if(u) u.value='[base64]'; this._scheduleSave(html); };
      reader.readAsDataURL(file); document.body.removeChild(input);
    });
    input.click();
  }

  _exportJSON(){ LiveNewspaper.exportJSON(); }

  _importJSON(html){
    const dlg=new foundry.applications.api.DialogV2({
      window:{title:'Импорт JSON',icon:'fas fa-file-import'},
      content:`<div style="padding:8px;display:flex;flex-direction:column;gap:8px;height:320px;">
        <p style="color:#aaa;font-size:.8rem;margin:0;">Вставьте содержимое JSON или выберите файл:</p>
        <button id="imp-file-btn" style="padding:5px 10px;background:#1a3a1a;border:1px solid #2a6a2a;color:#88ff88;border-radius:4px;cursor:pointer;align-self:flex-start;"><i class="fas fa-folder-open"></i> Выбрать файл...</button>
        <textarea id="imp-json-ta" style="flex:1;background:#111;color:#ccc;border:1px solid #444;padding:8px;font-family:monospace;font-size:11px;resize:none;" placeholder='{"version":"5.5","data":{"pages":[...]}}'></textarea>
      </div>`,
      buttons:[
        {
          action:'import',
          label:'Импортировать',
          icon:'fas fa-file-import',
          default:true,
          /* callback вызывается пока dialog.element ещё жив */
          callback: async (event, button, dialog) => {
            const text=dialog.element?.querySelector('#imp-json-ta')?.value?.trim();
            if(!text) return;
            const ok=await LiveNewspaper.importJSON(text);
            if(ok){ this._currentPage=0; this._selectedId=null; this._history=[]; this._historyIdx=-1; this.render({force:true}); }
          },
        },
        {action:'cancel',label:'Отмена',icon:'fas fa-times'},
      ],
    });
    dlg.addEventListener('render',()=>{
      const root=dlg.element; if(!root) return;
      root.querySelector('#imp-file-btn')?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ const ta=root.querySelector('#imp-json-ta'); if(ta) ta.value=t; }); }; inp.click(); });
    });
    dlg.render(true);
  }

  _openHtml2Text(html){

    // DIALOG
    const dlg = new foundry.applications.api.DialogV2({
      window:{ title:'HTML → Текст', icon:'fas fa-code' },
      content:`<div style="display:flex;flex-direction:column;gap:8px;height:480px;padding:8px;">
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <label style="color:#aaa;font-size:.8rem;flex:1;">Вставьте HTML-фрагмент:</label>
          <button id="h2t-paste" style="padding:4px 8px;background:#1a2a1a;border:1px solid #2a5a2a;color:#88cc88;border-radius:4px;cursor:pointer;font-size:.75rem;"><i class="fas fa-clipboard"></i> Вставить</button>
          <button id="h2t-clear-in" style="padding:4px 8px;background:#2a1a1a;border:1px solid #5a2a2a;color:#cc8888;border-radius:4px;cursor:pointer;font-size:.75rem;"><i class="fas fa-eraser"></i> Очистить</button>
        </div>
        <textarea id="h2t-in" style="flex:1.4;background:#111;color:#ddd;border:1px solid #444;padding:8px;font-family:monospace;font-size:11px;resize:none;" placeholder="<p>Вставьте HTML сюда…</p>"></textarea>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <button id="h2t-go" style="padding:6px 12px;background:#2d6a4f;border:none;color:#b7e4c7;border-radius:4px;cursor:pointer;font-size:.85rem;flex:1;"><i class="fas fa-magic"></i> Конвертировать</button>
          <label style="display:flex;align-items:center;gap:5px;color:#bbb;font-size:.75rem;white-space:nowrap;">
            <input type="checkbox" id="h2t-auto" checked> Авто при вводе
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <label style="color:#aaa;font-size:.8rem;flex:1;">Результат (WYSIWYG-разметка):</label>
          <span id="h2t-stats" style="font-size:.72rem;color:#666;"></span>
        </div>
        <textarea id="h2t-out" style="flex:1;background:#0a0a0a;color:#b0e0b0;border:1px solid #333;padding:8px;font-family:monospace;font-size:11px;resize:none;" readonly placeholder="Результат появится здесь…"></textarea>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button id="h2t-copy" style="padding:5px 10px;background:#333;border:1px solid #555;color:#ddd;border-radius:4px;cursor:pointer;flex:1;"><i class="fas fa-copy"></i> Копировать</button>
          <button id="h2t-insert" style="padding:5px 10px;background:#2e4a8b;border:none;color:#b0c4de;border-radius:4px;cursor:pointer;flex:2;"><i class="fas fa-paste"></i> Вставить в статью</button>
          <button id="h2t-insert-new" style="padding:5px 10px;background:#3a2e8b;border:none;color:#c4b0de;border-radius:4px;cursor:pointer;flex:2;"><i class="fas fa-plus-circle"></i> Новый элемент «Текст»</button>
        </div>
      </div>`,
      buttons:[{ action:'close', label:'Закрыть', icon:'fas fa-times' }],
    });

    dlg.addEventListener('render', ()=>{
      const root = dlg.element; if(!root) return;

      const inTA  = root.querySelector('#h2t-in');
      const outTA = root.querySelector('#h2t-out');
      const stats = root.querySelector('#h2t-stats');
      const autoChk = root.querySelector('#h2t-auto');

      const doConvert = () => {
        const result = this._html2wysiwyg(inTA?.value || '');
        if(outTA) outTA.value = result;
        if(stats){
          const words = result.trim().split(/\s+/).filter(Boolean).length;
          stats.textContent = result ? `${result.length} симв. · ${words} сл.` : '';
        }
        return result;
      };

      root.querySelector('#h2t-go')?.addEventListener('click', doConvert);
      inTA?.addEventListener('input', ()=>{ if(autoChk?.checked) doConvert(); });

      root.querySelector('#h2t-paste')?.addEventListener('click', async ()=>{
        try{
          const text = await navigator.clipboard.readText();
          if(inTA){ inTA.value = text; doConvert(); }
        } catch { ui.notifications.warn('Нет доступа к буферу обмена.'); }
      });
      root.querySelector('#h2t-clear-in')?.addEventListener('click', ()=>{
        if(inTA) inTA.value = '';
        if(outTA) outTA.value = '';
        if(stats) stats.textContent = '';
      });

      root.querySelector('#h2t-copy')?.addEventListener('click', ()=>{
        navigator.clipboard.writeText(outTA?.value||'').then(()=>ui.notifications.info('Скопировано!'));
      });

      /* Insert into existing body element */
      root.querySelector('#h2t-insert')?.addEventListener('click', ()=>{
        const text = outTA?.value || '';
        const page = this._getPageData();
        const bodyEl = page.elements.find(e=>e.type==='body');
        if(bodyEl){
          bodyEl.props.text = text;
          this._savePageData(page);
          this._buildCanvas(html);
          ui.notifications.info('Вставлено в «Текст статьи»!');
        } else {
          ui.notifications.warn('На странице нет элемента «Текст статьи». Используйте «Новый элемент».');
        }
        dlg.close();
      });

      /* Create a new body element with the converted text */
      root.querySelector('#h2t-insert-new')?.addEventListener('click', async ()=>{
        const text = outTA?.value || '';
        if(!text){ ui.notifications.warn('Нет текста для вставки.'); return; }
        await this._addElement('body', html);
        /* _addElement selects the new element; set its text */
        const page = this._getPageData();
        const newEl = page.elements[page.elements.length - 1];
        if(newEl && newEl.type === 'body'){
          newEl.props.text = text;
          await this._savePageData(page);
          this._buildCanvas(html);
          this._selectElement(newEl.id, html);
        }
        ui.notifications.info('Создан новый «Текст статьи»!');
        dlg.close();
      });
    });

    dlg.render(true);
  }

  async _resetPage(html){
    const ok=await this._confirm('Очистить страницу?','Все элементы будут удалены.'); if(!ok) return;
    const page=this._getPageData(); page.elements=[]; this._selectedId=null;
    await this._savePageData(page); this._pushHistory();
    this._buildCanvas(html); this._showPropsEmpty(html); ui.notifications.info('Страница очищена!');
  }

  async _confirm(title,content){
    return await DialogV2.confirm({window:{title},content:content?`<p>${content}</p>`:''});
  }

  async _askName(defaultVal=''){
    return await DialogV2.prompt({
      window:{title:'Название'},
      content:`<p style="margin:0 0 6px;font-size:.8rem;color:#aaa;">Название:</p><input type="text" id="cmt-name-inp" value="${defaultVal}" style="width:100%;padding:5px 8px;background:#1a1a1a;border:1px solid #555;color:#ddd;border-radius:3px;box-sizing:border-box;" autofocus>`,
      ok:{label:'OK', callback:(ev,btn,dialog)=>dialog.element?.querySelector('#cmt-name-inp')?.value??defaultVal},
      rejectClose:false,
    });
  }

  // --- GETTERS / HELPERS ---

  _getPageData(){ return LiveNewspaper.getPage(this._currentPage)||{elements:[],paperStyle:'classic',pageSize:'A4',customW:794,customH:1123,orientation:'portrait',paperColor:'',style:{}}; }
  _getCanvasSize(page){ page=page||this._getPageData(); const sz=PAGE_SIZES[page.pageSize]||PAGE_SIZES.A4; let w=(page.pageSize==='custom')?(page.customW||sz.w):sz.w, h=(page.pageSize==='custom')?(page.customH||sz.h):sz.h; if(page.orientation==='landscape') [w,h]=[h,w]; return {w,h}; }
  _scheduleSave(html,pushHist=false){
    if(!game.settings.get('campaign-master-tools','autoSaveEnabled')) return;
    if(pushHist) this._pushHistory();
    clearTimeout(this._saveTimer);
    this._saveTimer=setTimeout(()=>this._save(html,true),1500);
  }

  // --- BLOCK A: DROP HANDLER ---

  async _onCanvasDrop(event, html) {
    const canvas = html.querySelector('#nwpc-canvas'); if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let dropX = Math.round((event.clientX - rect.left) / this._zoom);
    let dropY = Math.round((event.clientY - rect.top)  / this._zoom);
    if(SNAP){ dropX = Math.round(dropX/GRID)*GRID; dropY = Math.round(dropY/GRID)*GRID; }

    let data = null;
    try { data = JSON.parse(event.dataTransfer.getData('text/plain')); } catch {}
    if(!data) {
      const raw = event.dataTransfer.getData('text/plain');
      if(/\.(webp|png|jpg|jpeg|gif|svg)$/i.test(raw)) data = { type:'_rawImage', src: raw };
    }
    const file = event.dataTransfer.files?.[0];
    if(!data && file?.type?.startsWith('image/')) data = { type:'_fileBlob', file };
    if(!data) return;

    const page = this._getPageData();
    const {w:cw, h:ch} = this._getCanvasSize(page);
    const newEls = [];

    // Raw image URL or Tile
    if(data.type === 'Tile' || data.type === '_rawImage') {
      const src = data.img || data.src;
      const url = await this._cropImage(src);
      newEls.push({ type:'image', x:Math.min(dropX,cw-300), y:Math.min(dropY,ch-250), w:300, h:250, props:{ url, caption:'', scale:100, borderStyle:'none' }, style:{} });
    }

    // File blob
    else if(data.type === '_fileBlob') {
      const url = await new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(data.file); });
      newEls.push({ type:'image', x:Math.min(dropX,cw-300), y:Math.min(dropY,ch-250), w:300, h:250, props:{ url, caption:'', scale:100, borderStyle:'none' }, style:{} });
    }

    // Actor
    else if(data.type === 'Actor') {
      const actor = await fromUuid(data.uuid);
      if(!actor) { ui.notifications.warn('Актёр не найден.'); return; }
      if(actor.img && actor.img !== 'icons/svg/mystery-man.svg') {
        const url = await this._cropImage(actor.img);
        newEls.push({ type:'image', x:Math.min(dropX,cw-200), y:Math.min(dropY,ch-200), w:200, h:200, props:{ url, caption:'', scale:100, borderStyle:'none', actorUuid: actor.uuid }, style:{} });
      }
      newEls.push({ type:'byline', x:Math.min(dropX,cw-200), y:Math.min(dropY+210,ch-28), w:200, h:28, props:{ text: actor.name, textColor:'', actorUuid: actor.uuid }, style:{} });
    }

    // JournalEntry
    else if(data.type === 'JournalEntry' || data.type === 'JournalEntryPage') {
      const doc = await fromUuid(data.uuid);
      if(!doc) { ui.notifications.warn('Запись журнала не найдена.'); return; }
      const entry  = doc.documentName === 'JournalEntry' ? doc : doc.parent;
      const pageDoc = doc.documentName === 'JournalEntryPage' ? doc : entry?.pages?.find(p=>p.type==='text');
      const title  = doc.name || entry?.name || '';
      newEls.push({ type:'headline', x:Math.min(dropX,cw-400), y:Math.min(dropY,ch-80), w:400, h:80, props:{ text: title, fontSize:28, fontUnit:'px', textColor:'' }, style:{} });
      if(pageDoc?.type === 'text' && pageDoc?.text?.content) {
        const bodyText = this._html2wysiwyg(pageDoc.text.content);
        newEls.push({ type:'body', x:Math.min(dropX,cw-400), y:Math.min(dropY+90,ch-200), w:400, h:200, props:{ text: bodyText, fontSize:13, fontUnit:'px', dropCap:false, columns:1, textColor:'' }, style:{} });
      } else if(pageDoc?.type !== 'text') {
        ui.notifications.warn('Страница журнала не содержит текста в формате HTML.');
      }
    }

    if(!newEls.length) return;

    this._pushHistory();
    newEls.forEach(el => { el.id = `el_${el.type}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; page.elements.push(el); });
    await this._savePageData(page);
    this._buildCanvas(html);
    this._selectElement(newEls[0].id, html);
    this._scheduleSave(html);
  }

  // --- BLOCK A: AUTO-CROP TRANSPARENT PNG ---

  async _cropImage(src) {
    if(!src) return src;
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = img.naturalWidth; cv.height = img.naturalHeight;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
          let minX=cv.width,minY=cv.height,maxX=0,maxY=0;
          for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++) {
            if(data[(y*cv.width+x)*4+3]>10){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
          }
          const origArea = cv.width*cv.height;
          const cropArea = Math.max(1,(maxX-minX+1)*(maxY-minY+1));
          if(cropArea/origArea > 0.98){ resolve(src); return; } /* <2% — не обрезаем */
          const cv2 = document.createElement('canvas');
          cv2.width=maxX-minX+1; cv2.height=maxY-minY+1;
          cv2.getContext('2d').drawImage(cv, minX, minY, cv2.width, cv2.height, 0, 0, cv2.width, cv2.height);
          resolve(cv2.toDataURL('image/png'));
        } catch { resolve(src); } /* cross-origin без CORS */
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  // --- BLOCK A+D: HTML → WYSIWYG (extracted from _openHtml2Text) ---

  _html2wysiwyg(rawHtml) {
    if(!rawHtml || !rawHtml.trim()) return '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawHtml;
    ['script','style','noscript','iframe','object','embed','form','input','button','select','textarea','link','meta','canvas','video','audio','svg','math'].forEach(tag=>{
      wrapper.querySelectorAll(tag).forEach(el=>el.remove());
    });
    wrapper.querySelectorAll('*').forEach(el=>{
      Array.from(el.attributes).forEach(attr=>{
        if(/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        if(/(href|src|action)/i.test(attr.name) && /^javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
      });
    });
    function extractText(node) {
      if(node.nodeType===Node.TEXT_NODE) return node.textContent.replace(/\s+/g,' ');
      if(node.nodeType!==Node.ELEMENT_NODE) return '';
      const tag=node.tagName.toLowerCase();
      const children=Array.from(node.childNodes).map(extractText).join('');
      if(tag==='br') return '\n';
      if(tag==='hr') return '\n\n---\n\n';
      if(/^h[1-6]$/.test(tag)){ const p=parseInt(tag[1])<=2?'■ ':'▸ '; return `\n\n${p}**${children.trim()}**\n\n`; }
      if(['p','div','section','article','header','footer','aside','main','nav','figure','figcaption'].includes(tag)){ const i=children.trim(); return i?`\n\n${i}\n\n`:''; }
      if(tag==='blockquote'){ return `\n\n${children.trim().split('\n').map(l=>`> ${l}`).join('\n')}\n\n`; }
      if(tag==='ul'||tag==='ol') return `\n${children}\n`;
      if(tag==='li') return `\n• ${children.trim()}`;
      if(tag==='td'||tag==='th') return `${children}\t`;
      if(tag==='tr') return `${children.replace(/\t$/,'')}\n`;
      if(['table','tbody','thead','tfoot'].includes(tag)) return `\n${children}\n`;
      if(tag==='dt') return `\n**${children.trim()}**`;
      if(tag==='dd') return `\n  ${children.trim()}`;
      if(tag==='pre'||tag==='code') return `\n\n${node.textContent}\n\n`;
      if(tag==='strong'||tag==='b') return `**${children}**`;
      if(tag==='em'||tag==='i') return `*${children}*`;
      if(tag==='s'||tag==='del'||tag==='strike') return `~~${children}~~`;
      if(tag==='u') return `__${children}__`;
      if(tag==='mark') return `**${children}**`;
      return children;
    }
    return extractText(wrapper)
      .replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n')
      .replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n')
      .replace(/\*\*\s+\*\*/g,' ').replace(/\*\s+\*/g,' ').trim();
  }

  // --- BLOCK D: AUTHOR DIALOG ---

  async _openAuthorDialog(html) {
    const page = this._getPageData();
    const actorOptions = game.actors.map(a=>
      `<option value="${a.uuid}" ${page.authorUuid===a.uuid?'selected':''}>${a.name.replace(/</g,'&lt;')} (${a.type})</option>`
    ).join('');

    /* FIX V13: DialogV2 closes (element becomes null) BEFORE async callback resolves.
     * Use a closure variable updated synchronously via 'change' event. */
    let pendingUuid = page.authorUuid || '';

    const dlg = new foundry.applications.api.DialogV2({
      window:{ title:'Автор страницы', icon:'fas fa-feather-alt' },
      content:`<div style="padding:8px;display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="font-size:.75rem;color:#aaa;display:block;margin-bottom:3px;">Выбрать автора (актёра):</label>
          <select id="dlg-author-select" style="width:100%;padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;">
            <option value="">— Без автора —</option>
            ${actorOptions}
          </select>
        </div>
        <div id="dlg-author-preview" style="min-height:40px;"></div>
      </div>`,
      buttons:[
        {
          action:'save', label:'Сохранить', icon:'fas fa-check', default:true,
          callback: async() => {
            /* Read pendingUuid from closure — dialog.element is already null here in V13 */
            const uuid = pendingUuid || null;
            const page = this._getPageData();
            page.authorUuid = uuid || null;
            await this._savePageData(page);
            this._updateAuthorBadge(html);
          },
        },
        { action:'cancel', label:'Отмена', icon:'fas fa-times' },
      ],
    });
    dlg.addEventListener('render', ()=>{
      const root=dlg.element; if(!root) return;
      const sel=root.querySelector('#dlg-author-select');
      const prev=root.querySelector('#dlg-author-preview');
      /* Sync closure variable on every change */
      sel?.addEventListener('change', async ()=>{
        pendingUuid = sel.value;
        if(!sel.value){ prev.innerHTML=''; return; }
        const actor=await fromUuid(sel.value); if(!actor) return;
        prev.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:6px;background:#111;border-radius:3px;">
          <img src="${actor.img}" style="width:36px;height:36px;object-fit:cover;border-radius:3px;">
          <span style="color:#ddd;font-size:.85rem;">${actor.name}</span>
        </div>`;
      });
      if(sel?.value) sel.dispatchEvent(new Event('change'));
    });
    dlg.render(true);
  }

  _updateAuthorBadge(html) {
    const btn = html?.querySelector('#ed-author-btn'); if(!btn) return;
    const page = this._getPageData();
    btn.classList.toggle('nwpc-btn-has-author', !!page.authorUuid);
  }

  // --- BLOCK D: PUBLISH TO JOURNAL ---

  async _publishToJournal(page, title) {
    const { pageToJournalHTML } = await import('../newspaper.mjs');
    const moduleName = 'campaign-master-tools';
    const journalName = `Газета — ${title}`;
    let entry = game.journal.find(j => j.getFlag(moduleName,'isNewspaper'));
    if(!entry) {
      entry = await JournalEntry.create({ name: journalName, ownership:{ default:2 } });
      await entry.setFlag(moduleName,'isNewspaper',true);
    } else {
      await entry.update({ name: journalName });
    }
    const html = pageToJournalHTML(page);
    const pageDate = new Date().toISOString();
    const authorData = page.authorUuid
      ? { uuid: page.authorUuid, name: (await fromUuid(page.authorUuid))?.name ?? '' }
      : null;
    const existing = entry.pages.find(p => p.getFlag(moduleName,'publishDate') === pageDate.slice(0,10));
    if(existing) {
      await existing.update({ 'text.content': html });
    } else {
      await entry.createEmbeddedDocuments('JournalEntryPage', [{
        name: `Выпуск ${new Date().toLocaleDateString('ru')}`,
        type: 'text',
        text: { content: html, format: 1 },
        flags: { [moduleName]: { publishDate: pageDate.slice(0,10), author: authorData } },
      }]);
    }
    ui.notifications.info(`Газета сохранена в Журнал: "${journalName}"`);
  }

  // --- TEMPLATE GALLERY ---

  async _openTemplateGallery(html) {
    const { TEMPLATES } = await import('../templates.mjs');
    const grid = TEMPLATES.map(t => `
      <div class="nwpc-tpl-card" data-id="${t.id}" title="${t.label}" style="
        cursor:pointer;padding:14px 8px;border:2px solid #333;border-radius:6px;
        text-align:center;background:#1a1a1a;transition:border-color .15s;display:flex;
        flex-direction:column;align-items:center;gap:6px;">
        <i class="${t.icon}" style="font-size:1.8rem;color:#c9a84c;"></i>
        <div style="font-size:.78rem;color:#ddd;font-weight:600;">${t.label}</div>
        <div style="font-size:.68rem;color:#888;">${t.paperStyle}</div>
      </div>`).join('');

    const dlg = new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize('cmt.templates.title'), icon: 'fas fa-th-large' },
      content: `
        <p style="font-size:.75rem;color:#aaa;margin:0 0 10px;">
          ${game.i18n.localize('cmt.templates.hint')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" id="nwpc-tpl-grid">
          ${grid}
        </div>`,
      buttons: [{ action:'cancel', label: game.i18n.localize('CMT.buttons.cancel'), icon:'fas fa-times' }],
    });

    dlg.addEventListener('render', () => {
      const root = dlg.element; if(!root) return;
      root.querySelectorAll('.nwpc-tpl-card').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#c9a84c'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#333'; });
        card.addEventListener('click', async () => {
          const tpl = TEMPLATES.find(t => t.id === card.dataset.id);
          if(!tpl) return;
          dlg.close();
          await this._applyTemplate(tpl, html);
        });
      });
    });
    dlg.render(true);
  }

  async _applyTemplate(tpl, html) {
    const ok = await DialogV2.confirm({
      window: { title: game.i18n.localize('cmt.templates.confirmTitle') },
      content: `<p>${game.i18n.localize('cmt.templates.confirmBody').replace('{name}', tpl.label)}</p>`,
    });
    if(!ok) return;
    this._pushHistory();
    const page = this._getPageData();
    const { w, h } = this._getCanvasSize(page);
    page.paperStyle = tpl.paperStyle;
    const rawEls = tpl.makeElements(w, h);
    page.elements = rawEls.map(el => ({
      ...el,
      id: el.id || `el_${el.type}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      style: el.style || {},
    }));
    await this._savePageData(page);
    this._syncToolbarToPage(html);
    this._buildCanvas(html);
    this._autoFitZoom(html);
    this._showPropsEmpty(html);
    this._selectedId = null;
    ui.notifications.info(`${game.i18n.localize('cmt.templates.applied')}: ${tpl.label}`);
  }

  // --- BREAKING NEWS ---

  async _openBreakingNewsDialog(html) {
    const page = this._getPageData();
    const head = page.elements?.find(e => e.type === 'headline');

    let pendingData = null;

    const dlg = new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize('cmt.breaking.title'), icon: 'fas fa-bolt' },
      content: `
        <div style="display:flex;flex-direction:column;gap:10px;padding:8px;">
          <label style="display:flex;flex-direction:column;gap:3px;font-size:.8rem;color:#aaa;">
            ${game.i18n.localize('cmt.breaking.headline')}
            <input id="bn-headline" type="text" value="${head?.props?.text?.replace(/"/g,'&quot;') ?? ''}"
              style="padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;">
          </label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:.8rem;color:#aaa;">
            ${game.i18n.localize('cmt.breaking.subheadline')}
            <input id="bn-sub" type="text" placeholder="${game.i18n.localize('cmt.breaking.subPlaceholder')}"
              style="padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;">
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label style="display:flex;flex-direction:column;gap:3px;font-size:.8rem;color:#aaa;">
              ${game.i18n.localize('cmt.breaking.style')}
              <select id="bn-style" style="padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;">
                <option value="classic">${game.i18n.localize('cmt.breaking.styleClassic')}</option>
                <option value="noir">${game.i18n.localize('cmt.breaking.styleNoir')}</option>
                <option value="cyber">${game.i18n.localize('cmt.breaking.styleCyber')}</option>
                <option value="gothic">${game.i18n.localize('cmt.breaking.styleGothic')}</option>
                <option value="vintage">${game.i18n.localize('cmt.breaking.styleVintage')}</option>
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:3px;font-size:.8rem;color:#aaa;">
              ${game.i18n.localize('cmt.breaking.autoClose')}
              <select id="bn-autoclose" style="padding:5px 8px;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:3px;">
                <option value="0">${game.i18n.localize('cmt.breaking.autoCloseManual')}</option>
                <option value="10">10 ${game.i18n.localize('cmt.breaking.seconds')}</option>
                <option value="20">20 ${game.i18n.localize('cmt.breaking.seconds')}</option>
                <option value="30">30 ${game.i18n.localize('cmt.breaking.seconds')}</option>
              </select>
            </label>
          </div>
        </div>`,
      buttons: [
        {
          action: 'send',
          label: game.i18n.localize('cmt.breaking.sendBtn'),
          icon: 'fas fa-broadcast-tower',
          default: true,
          callback: (event, button, dialog) => {
            const root = dialog.element;
            const headline  = root?.querySelector('#bn-headline')?.value?.trim();
            const sub       = root?.querySelector('#bn-sub')?.value?.trim();
            const style     = root?.querySelector('#bn-style')?.value || 'classic';
            const autoClose = parseInt(root?.querySelector('#bn-autoclose')?.value || '0');
            if(!headline) { ui.notifications.warn(game.i18n.localize('cmt.breaking.noHeadline')); return false; }
            pendingData = { headline, subheadline: sub, paperStyle: style, autoClose };
          },
        },
        { action:'cancel', label: game.i18n.localize('CMT.buttons.cancel'), icon:'fas fa-times' },
      ],
    });

    dlg.addEventListener('close', async () => {
      if(!pendingData) return;
      await this._sendBreakingNews(pendingData);
    });
    dlg.render(true);
  }

  async _sendBreakingNews(data) {
    const { BreakingNewsOverlay } = await import('./breaking-news.mjs');
    new BreakingNewsOverlay(data).render(true);
    game.socket.emit('module.campaign-master-tools', { action: 'showBreakingNews', data });
    ui.notifications.info(game.i18n.localize('cmt.breaking.sent'));
  }

  _onClose(options){
    this._stopSaveTicker();
    return super._onClose(options);
  }
}
