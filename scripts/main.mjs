// Campaign Master Tools — entry point
// Teddy Bear

import { LiveNewspaper } from './newspaper.mjs';
import { NewsEditorApp } from './apps/news-editor.mjs';
import { NewsViewerApp } from './apps/news-viewer.mjs';
import { registerSocket } from './socket.mjs';
import { registerFeatureFlags, isFeatureEnabled } from './feature-flags.mjs';
import { FlagsMenuApp } from './apps/flags-menu.mjs';

const log  = msg => console.log('[Campaign Master]', msg);
const warn = msg => console.warn('[Campaign Master]', msg);

function openEditor() {
  try {
    if (!isFeatureEnabled('editor')) { ui.notifications.warn('Редактор газеты отключён в настройках модуля.'); return; }
    if (!LiveNewspaper.canDo('Create')) { ui.notifications.warn('Недостаточно прав.'); return; }
    const app = foundry.applications.instances.get('cmt-news-editor');
    if (app) app.bringToFront();
    else new NewsEditorApp().render(true);
  } catch(e) { console.error('[CMT] Editor error:', e); }
}

function openViewer() {
  try {
    if (!isFeatureEnabled('viewer')) { ui.notifications.warn('Просмотр газеты отключён в настройках модуля.'); return; }
    if (!LiveNewspaper.canDo('View')) { ui.notifications.warn('Недостаточно прав.'); return; }
    const app = foundry.applications.instances.get('cmt-news-viewer');
    if (app) app.bringToFront();
    else new NewsViewerApp().render(true);
  } catch(e) { console.error('[CMT] Viewer error:', e); }
}

Hooks.once('init', () => {
  window.CampaignMaster = {
    Newspaper: LiveNewspaper,
    Apps: { NewsEditor: NewsEditorApp, NewsViewer: NewsViewerApp },
    openEditor,
    openViewer,
  };
  LiveNewspaper.register();
  registerFeatureFlags();
  game.settings.registerMenu('campaign-master-tools', 'flagsMenu', {
    name: 'Переключатели функций',
    label: 'Открыть настройки функций',
    hint: 'Включение/выключение отдельных функций модуля по блокам, готовые пресеты кампании.',
    icon: 'fas fa-sliders-h',
    type: FlagsMenuApp,
    restricted: true,
  });
  log('Газета зарегистрирована');
});

Hooks.once('socketlib.ready', () => {
  registerSocket();
  log('socketlib подключён');
});

Hooks.once('ready', () => {
  LiveNewspaper.init();
  log('Campaign Master Tools активирован');

  if (game.user.isGM) {
    LiveNewspaper.migrateBase64Images().catch(e => console.warn('[CMT] Миграция base64 не выполнена:', e));
  }
});

Hooks.on('getSceneControlButtons', controls => {
  try {
    const notesControl = controls.notes;
    if (!notesControl) { warn('Не найден controls.notes — кнопки не добавлены'); return; }

    if (game.user.isGM && LiveNewspaper.canDo('Create') && isFeatureEnabled('editor') && isFeatureEnabled('buttonsNotes')) {
      notesControl.tools['cmt-editor'] = {
        name:     'cmt-editor',
        title:    game.i18n.localize('cmt.controls.editorTitle'),
        icon:     'fas fa-newspaper',
        button:   true,
        onChange: () => openEditor(),
      };
    }

    if (LiveNewspaper.canDo('View') && isFeatureEnabled('viewer') && isFeatureEnabled('buttonsNotes')) {
      notesControl.tools['cmt-viewer'] = {
        name:     'cmt-viewer',
        title:    game.i18n.localize('cmt.controls.viewerTitle'),
        icon:     'fas fa-book-open',
        button:   true,
        onChange: () => openViewer(),
      };
    }

    log('Кнопки добавлены в controls.notes');
  } catch(e) { warn('Ошибка панели: ' + e.message); }
});

Hooks.on('renderJournalDirectory', (app, html) => {
  const element = (html instanceof HTMLElement) ? html : html[0];
  const actionButtons = element.querySelector('.header-actions');
  if (!actionButtons) return;

  const canView = LiveNewspaper.canDo('View') && isFeatureEnabled('viewer') && isFeatureEnabled('buttonsJournal');
  const canCreate = game.user.isGM && LiveNewspaper.canDo('Create') && isFeatureEnabled('editor') && isFeatureEnabled('buttonsJournal');

  if (canCreate) {
    const div = document.createElement('div');
    div.classList.add('flexrow');
    div.style.cssText = 'margin-top:0;gap:5px;width:100%;';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.innerHTML = `<i class="fas fa-newspaper"></i> ${game.i18n.localize('cmt.controls.editorBtn')}`;
    btnEdit.style.flex = '1';
    btnEdit.onclick = e => { e.preventDefault(); openEditor(); };

    const btnView = document.createElement('button');
    btnView.type = 'button';
    btnView.innerHTML = `<i class="fas fa-book-open"></i> ${game.i18n.localize('cmt.controls.viewerBtn')}`;
    btnView.style.flex = '1';
    btnView.onclick = e => { e.preventDefault(); openViewer(); };

    div.appendChild(btnEdit);
    div.appendChild(btnView);
    actionButtons.appendChild(div);
  } else if (canView) {
    const btnView = document.createElement('button');
    btnView.type = 'button';
    btnView.innerHTML = `<i class="fas fa-book-open"></i> ${game.i18n.localize('cmt.controls.viewerBtn')}`;
    btnView.style.cssText = 'flex:0 0 100%;max-width:100%;margin-top:6px;';
    btnView.onclick = e => { e.preventDefault(); openViewer(); };
    actionButtons.appendChild(btnView);
  }
});

Hooks.on('renderChatMessageHTML', (msg, html) => {
  try {
    const root = html instanceof HTMLElement ? html : html?.[0];
    root?.querySelectorAll('.cmt-open-newspaper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const app = foundry.applications.instances.get('cmt-news-viewer');
        if (app) app.bringToFront(); else new NewsViewerApp().render(true);
      });
    });
  } catch(e) { console.error('[CMT] renderChatMessageHTML error:', e); }
});

log('Campaign Master Tools v2.0.0 загружен');
