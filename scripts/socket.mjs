// Teddy Bear

import { LiveNewspaper } from './newspaper.mjs';

const MODULE_ID = 'campaign-master-tools';
let socket = null;

export function getSocket() { return socket; }

async function gmRevealElement(pageIdx, elId) {
  const d = LiveNewspaper.getData();
  const page = d.pages[pageIdx];
  const el = page?.elements?.find(e => e.id === elId);
  if (!el) return;
  el.revealed = true;
  await LiveNewspaper.setPage(pageIdx, page);
  socket.executeForEveryone('refreshViewer');
}

async function gmCreatePersonalJournal(userId, title, content) {
  const user = game.users.get(userId);
  if (!user) return null;
  const safeContent = TextEditor.sanitizeHTML(content ?? '');
  const entry = await JournalEntry.create({
    name: title,
    ownership: { default: 0, [userId]: 3 },
  });
  await entry.createEmbeddedDocuments('JournalEntryPage', [{
    name: title,
    type: 'text',
    text: { content: safeContent, format: 1 },
  }]);
  socket.executeForUser('journalCreated', userId, entry.id);
  return entry.id;
}

async function refreshViewer() {
  await LiveNewspaper.init();
  foundry.applications.instances.get('cmt-news-viewer')?.render({ force: true });
}

function journalCreated(journalId) {
  ui.notifications.info('Страница газеты сохранена в ваш Журнал!');
  setTimeout(() => {
    const entry = game.journal.get(journalId);
    entry?.sheet?.render(true);
  }, 500);
}

function forceViewerPage(pageIdx) {
  const viewer = foundry.applications.instances.get('cmt-news-viewer');
  if (viewer) { viewer._currentPage = pageIdx; viewer.render({ force: true }); }
}

async function openViewerForUser() {
  const { NewsViewerApp } = await import('./apps/news-viewer.mjs');
  const app = foundry.applications.instances.get('cmt-news-viewer');
  if (app) app.bringToFront(); else new NewsViewerApp().render(true);
}

async function showBreakingNews(data) {
  const { BreakingNewsOverlay } = await import('./apps/breaking-news.mjs');
  new BreakingNewsOverlay(data).render(true);
}

export function createPersonalJournalForUser(userId, title, content) {
  return gmCreatePersonalJournal(userId, title, content);
}

export function registerSocket() {
  socket = socketlib.registerModule(MODULE_ID);
  socket.register('gmRevealElement', gmRevealElement);
  socket.register('gmCreatePersonalJournal', gmCreatePersonalJournal);
  socket.register('refreshViewer', refreshViewer);
  socket.register('journalCreated', journalCreated);
  socket.register('forceViewerPage', forceViewerPage);
  socket.register('openViewerForUser', openViewerForUser);
  socket.register('showBreakingNews', showBreakingNews);
}

export function requestRevealElement(pageIdx, elId) {
  return socket.executeAsGM('gmRevealElement', pageIdx, elId);
}

export function requestPersonalJournal(userId, title, content) {
  return socket.executeAsGM('gmCreatePersonalJournal', userId, title, content);
}

export function broadcastForceViewerPage(pageIdx) {
  return socket.executeForOthers('forceViewerPage', pageIdx);
}

export function broadcastBreakingNews(data) {
  return socket.executeForOthers('showBreakingNews', data);
}

export function openViewerForUsers(userIds) {
  return Promise.all(userIds.map(id => socket.executeForUser('openViewerForUser', id)));
}
