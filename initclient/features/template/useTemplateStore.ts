import { create } from 'zustand';
import type { TemplateModel } from 'thredlib';

interface InteractionValues {
  [inputName: string]: any;
}

interface TemplateState {
  /** Map of eventId → interactionIndex → input values */
  templates: Record<string, InteractionValues[]>;

  initTemplate: (eventId: string, template: TemplateModel) => void;
  setValue: (
    eventId: string,
    interactionIndex: number,
    inputName: string,
    value: any,
  ) => void;
  isInteractionComplete: (eventId: string, interactionIndex: number) => boolean;
  areAllComplete: (eventId: string) => boolean;
  getEventContent: (
    eventId: string,
    template: TemplateModel,
  ) => { type: string; values: Record<string, any> };
  cleanup: (eventId: string) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: {},

  initTemplate: (eventId, template) => {
    if (get().templates[eventId]) return; // already initialized
    const interactions = template.interactions.map(() => ({}));
    set((s) => ({
      templates: { ...s.templates, [eventId]: interactions },
    }));
  },

  setValue: (eventId, interactionIndex, inputName, value) => {
    set((s) => {
      const interactions = [...(s.templates[eventId] ?? [])];
      interactions[interactionIndex] = {
        ...interactions[interactionIndex],
        [inputName]: value,
      };
      return { templates: { ...s.templates, [eventId]: interactions } };
    });
  },

  isInteractionComplete: (eventId, interactionIndex) => {
    const interactions = get().templates[eventId];
    if (!interactions?.[interactionIndex]) return false;
    return Object.keys(interactions[interactionIndex]).length > 0;
  },

  areAllComplete: (eventId) => {
    const interactions = get().templates[eventId];
    if (!interactions || interactions.length === 0) return false;
    return interactions.every((values) => Object.keys(values).length > 0);
  },

  getEventContent: (eventId, template) => {
    const interactions = get().templates[eventId] ?? [];
    const values = interactions.reduce(
      (acc, vals) => ({ ...acc, ...vals }),
      {},
    );
    return { type: template.name, values };
  },

  cleanup: (eventId) => {
    set((s) => {
      const { [eventId]: _, ...rest } = s.templates;
      return { templates: rest };
    });
  },
}));
