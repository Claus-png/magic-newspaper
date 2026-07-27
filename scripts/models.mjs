// Teddy Bear

const { fields } = foundry.data;
const { DataModel } = foundry.abstract;

export class NewsElementModel extends DataModel {
  static defineSchema() {
    return {
      id:    new fields.StringField({ required: true, blank: false }),
      type:  new fields.StringField({
        required: true,
        choices: ['masthead','headline','body','image','rule','quote','box','ad','byline'],
      }),
      x: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      y: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      w: new fields.NumberField({ required: true, integer: true, positive: true, initial: 100 }),
      h: new fields.NumberField({ required: true, integer: true, positive: true, initial: 100 }),
      revealed: new fields.BooleanField({ required: false, initial: false }),
      visibility: new fields.StringField({ required: false, initial: 'all', choices: ['all','gm','role','users','reveal','trigger'] }),
      visibilityRole: new fields.NumberField({ required: false, nullable: true, initial: null }),
      visibilityUserIds: new fields.ArrayField(new fields.StringField(), { required: false, initial: [] }),
      triggerType: new fields.StringField({ required: false, initial: 'effect', choices: ['effect','flag'] }),
      triggerKey:  new fields.StringField({ required: false, initial: '', blank: true }),
      gmNote: new fields.StringField({ required: false, initial: '', blank: true }),
      variants: new fields.ObjectField({ required: false, initial: {} }),
      props: new fields.ObjectField({ required: true, initial: {} }),
    };
  }
}

export class NewsPageModel extends DataModel {
  static defineSchema() {
    return {
      id:          new fields.StringField({ required: true, blank: false }),
      paperStyle:  new fields.StringField({ required: false, initial: 'classic' }),
      paperColor:  new fields.StringField({ required: false, initial: '', blank: true }),
      pageSize:    new fields.StringField({ required: false, initial: 'A4' }),
      customW:     new fields.NumberField({ required: false, integer: true, initial: 794 }),
      customH:     new fields.NumberField({ required: false, integer: true, initial: 1123 }),
      orientation: new fields.StringField({ required: false, initial: 'portrait', choices: ['portrait','landscape'] }),
      isDraft:     new fields.BooleanField({ required: false, initial: false }),
      authorUuid:  new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
      revisionId:  new fields.NumberField({ required: false, integer: true, initial: 0 }),
      elements:    new fields.ArrayField(new fields.EmbeddedDataField(NewsElementModel), { required: true, initial: [] }),
    };
  }
}

export class NewspaperDataModel extends DataModel {
  static defineSchema() {
    return {
      pages:       new fields.ArrayField(new fields.EmbeddedDataField(NewsPageModel), { required: true, initial: [] }),
      currentPage: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      updatedAt:   new fields.StringField({ required: false, nullable: true, initial: null }),
    };
  }
}

export class ArchiveEntryModel extends DataModel {
  static defineSchema() {
    return {
      id:       new fields.StringField({ required: true, blank: false }),
      name:     new fields.StringField({ required: false, initial: '' }),
      date:     new fields.StringField({ required: true }),
      pageData: new fields.EmbeddedDataField(NewsPageModel, { required: true }),
    };
  }
}

export class NewspaperArchiveModel extends DataModel {
  static defineSchema() {
    return {
      entries: new fields.ArrayField(new fields.EmbeddedDataField(ArchiveEntryModel), { required: true, initial: [] }),
    };
  }
}

export class DraftEntryModel extends DataModel {
  static defineSchema() {
    return {
      id:        new fields.StringField({ required: true, blank: false }),
      name:      new fields.StringField({ required: false, initial: '' }),
      date:      new fields.StringField({ required: true }),
      pageIndex: new fields.NumberField({ required: false, integer: true, initial: 0 }),
      pageData:  new fields.EmbeddedDataField(NewsPageModel, { required: true }),
    };
  }
}

export class NewspaperDraftModel extends DataModel {
  static defineSchema() {
    return {
      pages: new fields.ArrayField(new fields.EmbeddedDataField(DraftEntryModel), { required: true, initial: [] }),
    };
  }
}
