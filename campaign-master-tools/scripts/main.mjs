// Campaign Master Tools — entry point
// Teddy Bear

import { LiveNewspaper } from './newspaper.mjs';
import { NewsEditorApp } from './apps/news-editor.mjs';
import { NewsViewerApp } from './apps/news-viewer.mjs';

const log  = msg => console.log('[Campaign Master]', msg);
const warn = msg => console.warn('[Campaign Master]', msg);

function openEditor() {
  try {
    if (!LiveNewspaper.canDo('Create')) { ui.notifications.warn('Недостаточно прав.'); return; }
    const app = foundry.applications.instances.get('cmt-news-editor');
    if (app) app.bringToFront();
    else new NewsEditorApp().render(true);
  } catch(e) { console.error('[CMT] Editor error:', e); }
}

function openViewer() {
  try {
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
  log('Газета зарегистрирована');
});

Hooks.once('ready', () => {
  LiveNewspaper.init();
  log('Campaign Master Tools активирован');

  game.socket.on('module.campaign-master-tools', async payload => {

    // GM получает запрос раскрыть элемент, обновляет данные и рассылает refresh всем
    if (payload.action === 'revealElement' && game.user.isGM) {
      const d = LiveNewspaper.getData();
      const page = d.pages[payload.pageIdx];
      const el = page?.elements?.find(e => e.id === payload.elId);
      if (!el) return;
      el.revealed = true;
      await LiveNewspaper.setPage(payload.pageIdx, page);
      game.socket.emit('module.campaign-master-tools', { action: 'refreshViewer' });
    }

    // Всем клиентам — перезагрузить вьювер
    if (payload.action === 'refreshViewer') {
      await LiveNewspaper.init();
      foundry.applications.instances.get('cmt-news-viewer')?.render({ force: true });
    }

    // GM создаёт личную запись журнала для конкретного игрока
    if (payload.action === 'createPersonalJournal' && game.user.isGM) {
      const user = game.users.get(payload.userId);
      if (!user) return;
      // Прогоняем через TextEditor.sanitizeHTML — убирает потенциально опасный HTML
      const safeContent = TextEditor.sanitizeHTML(payload.content ?? '');
      const entry = await JournalEntry.create({
        name: payload.title,
        ownership: { default: 0, [payload.userId]: 3 },
      });
      await entry.createEmbeddedDocuments('JournalEntryPage', [{
        name: payload.title,
        type: 'text',
        text: { content: safeContent, format: 1 },
      }]);
      game.socket.emit('module.campaign-master-tools', {
        action: 'journalCreated',
        userId: payload.userId,
        journalId: entry.id,
      });
    }

    // Игрок получает уведомление и открывает только что созданную запись
    if (payload.action === 'journalCreated' && payload.userId === game.user.id) {
      ui.notifications.info('Страница газеты сохранена в ваш Журнал!');
      // Небольшая задержка — документ должен успеть синхронизироваться с сервером
      setTimeout(() => {
        const entry = game.journal.get(payload.journalId);
        entry?.sheet?.render(true);
      }, 500);
    }
    // GM принудительно переключает страницу у всех игроков (кнопка "Показать всем")
    if (payload.action === 'forceViewerPage') {
      const viewer = foundry.applications.instances.get('cmt-news-viewer');
      if (viewer) {
        viewer._currentPage = payload.pageIdx;
        viewer.render({ force: true });
      }
    }

    // Показать экстренный выпуск на экранах игроков
    if (payload.action === 'showBreakingNews' && !game.user.isGM) {
      import('./apps/breaking-news.mjs').then(({ BreakingNewsOverlay }) => {
        new BreakingNewsOverlay(payload.data).render(true);
      });
    }
  });
});

// Кнопки в панели Notes
Hooks.on('getSceneControlButtons', controls => {
  try {
    const notesControl = controls.notes;
    if (!notesControl) { warn('Не найден controls.notes — кнопки не добавлены'); return; }

    if (game.user.isGM && LiveNewspaper.canDo('Create')) {
      notesControl.tools['cmt-editor'] = {
        name:     'cmt-editor',
        title:    game.i18n.localize('cmt.controls.editorTitle'),
        icon:     'fas fa-newspaper',
        button:   true,
        onChange: () => openEditor(),
      };
    }

    if (LiveNewspaper.canDo('View')) {
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

// Кнопки в боковом журнале
Hooks.on('renderJournalDirectory', (app, html) => {
  const element = (html instanceof HTMLElement) ? html : html[0];
  const actionButtons = element.querySelector('.header-actions');
  if (!actionButtons) return;

  const canView = LiveNewspaper.canDo('View');
  const canCreate = game.user.isGM && LiveNewspaper.canDo('Create');

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

// Кнопка в сообщении чата — открыть вьювер
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

log('Campaign Master Tools v1.0.5 загружен');
