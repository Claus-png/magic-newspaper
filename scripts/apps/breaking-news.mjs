// BreakingNewsOverlay — полноэкранный оверлей экстренного выпуска
// Teddy Bear

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BreakingNewsOverlay extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(data = {}, options = {}) {
    super(options);
    this._data = data;
  }

  static DEFAULT_OPTIONS = {
    id: 'cmt-breaking-news',
    classes: ['cmt-breaking-overlay'],
    tag: 'div',
    window: { frame: false, positioned: false },
  };

  static PARTS = { sheet: { template: 'modules/campaign-master-tools/templates/breaking-news.hbs' } };

  async _prepareContext(options) {
    return {
      headline:    this._data.headline    || '',
      subheadline: this._data.subheadline || '',
      paperStyle:  this._data.paperStyle  || 'classic',
      autoClose:   this._data.autoClose   || 0,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    html.querySelector('.cmt-bn-close')?.addEventListener('click', () => this.close());
    html.querySelector('.cmt-bn-backdrop')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this.close();
    });

    if (context.autoClose > 0) {
      setTimeout(() => this.close(), context.autoClose * 1000);
    }

    // Звук уведомления
    try {
      foundry.audio.AudioHelper.play({
        src: 'modules/campaign-master-tools/sounds/notify.mp3',
        volume: 0.7,
        autoplay: true,
        loop: false,
      }, true);
    } catch(e) { /* тихо если аудио недоступно */ }
  }
}
