import {
  EventData,
  InteractionModel,
  PatternModel,
  ReactionModel,
  SystemEvents,
  TemplateModel,
  TransformModel,
  TransitionModel,
} from 'thredlib';
import { RootStore } from './RootStore';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { set } from 'lodash';

export type ContentType =
  | 'booleanInput'
  | 'numericInput'
  | 'textInput'
  | 'nominalInput'
  | 'image'
  | 'text'
  | 'map'
  | 'video'
  | 'group';

const contentTypes: Record<ContentType, any> = {
  booleanInput: {
    input: {
      type: 'boolean',
      display: '',
      name: '',
      set: [
        { display: '', value: true },
        { display: '', value: false },
      ],
    },
  },
  numericInput: { input: { type: 'numeric', display: '', name: '' } },
  textInput: { input: { type: 'text', display: '', name: '' } },
  nominalInput: { input: { type: 'nominal', display: '', name: '', multiple: false, set: [] } },
  image: { image: { height: 0, width: 0, uri: '' } },
  text: { text: { value: '' } },
  map: { map: { locations: [{ latitude: '', longitude: '', name: '' }] } },
  video: { video: { uri: '' } },
  group: { group: { items: [] } },
};

export class PatternStore {
  constructor(public pattern: PatternModel, readonly rootStore: RootStore) {
    makeObservable(this, {
      pattern: observable,
      updatePatternValue: action,
      removeReaction: action,
      addInteraction: action,
      addInteractionContent: action,
      addReaction: action,
      addTransform: action,
      addTransition: action,
      removeContent: action,
      removeInteraction: action,
      updatePattern: action,
    });
  }

  updatePattern(updateValues: any) {
    const userId = this.getUserId();
    const patternId = this.getPatternId();

    const updatePatternEvent = SystemEvents.getUpdatePatternEvent(
      patternId,
      { id: userId, name: userId },
      updateValues,
    );
    this.rootStore.connectionStore.exchange(updatePatternEvent, event => {});
  }

  private updateReaction(reactionIndex: number, update: Partial<ReactionModel>) {
    runInAction(() => {
      this.pattern.reactions[reactionIndex] = {
        ...this.pattern.reactions[reactionIndex],
        ...update,
      };
    });
  }

  updatePatternValue(updatePath: string, value: any) {
    runInAction(() => {
      set(this.pattern, updatePath, value);
    });
  }

  deletePattern() {
    const userId = this.getUserId();
    const patternId = this.getPatternId();

    const deletePatternEvent = SystemEvents.getDeletePatternEvent(patternId, { id: userId, name: userId });

    this.rootStore.connectionStore.exchange(deletePatternEvent, () => {
      runInAction(() => {
        this.rootStore.patternsStore.removePattern(patternId);
      });
    });
  }

  addInteraction(reactionIndex: number, path: string) {
    const currentInteractions =
      this.pattern.reactions[reactionIndex]?.condition.transform?.eventDataTemplate?.advice?.template?.interactions;
    const newInteraction: InteractionModel = {
      interaction: {
        content: [],
      },
    };

    runInAction(() => {
      if (
        !currentInteractions &&
        this.pattern.reactions[reactionIndex].condition.transform?.eventDataTemplate?.advice?.template
      ) {
        this.pattern.reactions[reactionIndex].condition.transform.eventDataTemplate.advice.template.interactions = [
          newInteraction,
        ];
      } else {
        this.pattern.reactions[
          reactionIndex
        ]?.condition.transform?.eventDataTemplate?.advice?.template?.interactions.push(newInteraction);
      }
    });

    this.updatePattern({
      [path]: [newInteraction],
    });
  }

  addTransform(index: number) {
    const newTransform: TransformModel = {
      description: '',
      templateXpr: '',
    };

    const reaction = this.pattern.reactions[index];
    this.updateReaction(index, { condition: { ...reaction.condition, transform: newTransform } });
  }

  addTransition(index: number) {
    const newTransition: TransitionModel = {
      name: '',
      description: '',
      input: 'default',
      localName: '',
    };
    const reaction = this.pattern.reactions[index];

    this.updateReaction(index, { condition: { ...reaction.condition, transition: newTransition } });
  }

  addEventDataTemplate(index: number) {
    const newEventDataTemplate: EventData = {
      title: '',
      description: '',
      advice: {
        eventType: '',
        title: '',
      },
    };
    const reaction = this.pattern.reactions[index];

    this.updateReaction(index, {
      condition: {
        ...reaction.condition,
        transform: {
          ...reaction.condition.transform,
          eventDataTemplate: newEventDataTemplate,
        },
      },
    });
  }

  addTemplate(index: number) {
    const newTemplate: TemplateModel = {
      interactions: [],
      name: '',
      description: '',
    };
    const reaction = this.pattern.reactions[index];

    this.updateReaction(index, {
      condition: {
        ...reaction.condition,
        transform: {
          ...reaction.condition.transform,
          eventDataTemplate: {
            ...reaction.condition.transform?.eventDataTemplate,
            advice: {
              ...reaction.condition.transform?.eventDataTemplate?.advice,
              template: newTemplate,
              eventType: reaction.condition.transform?.eventDataTemplate?.advice?.eventType || '',
            },
          },
        },
      },
    });
  }

  addInteractionContent(type: ContentType, interactionIndex: number, reactionIndex: number) {
    const content =
      this.pattern.reactions[reactionIndex]?.condition.transform?.eventDataTemplate?.advice?.template?.interactions?.at(
        interactionIndex,
      )?.interaction.content;

    if (content && contentTypes[type]) {
      content.push(contentTypes[type]);
    }
  }

  addReaction() {
    const reactions = this.pattern.reactions;
    const newReaction: ReactionModel = {
      name: '',
      description: '',
      condition: {
        publish: {
          to: [],
        },
        type: 'filter',
        xpr: '',
      },
    };

    runInAction(() => {
      this.pattern.reactions = [...reactions, newReaction];
    });

    if (reactions.length > 0) {
      this.updatePattern({ ['reactions']: [...reactions, newReaction] });
    } else {
      this.updatePattern({ ['reactions']: [newReaction] });
    }
  }

  removeInteraction(interactionIndex: number, reactionIndex: number, path: string) {
    const interactions =
      this.pattern.reactions[reactionIndex].condition.transform?.eventDataTemplate?.advice?.template?.interactions;

    runInAction(() => {
      interactions?.splice(interactionIndex, 1);
      this.pattern.reactions[
        reactionIndex
      ].condition.transform?.eventDataTemplate?.advice?.template?.interactions.splice(interactionIndex, 1);
    });
    this.updatePattern({ [path]: interactions });
  }

  removeContent(interactionIndex: number, reactionIndex: number, contentIndex: number, path: string) {
    const content =
      this.pattern.reactions[reactionIndex].condition.transform?.eventDataTemplate?.advice?.template?.interactions.at(
        interactionIndex,
      )?.interaction.content;
    runInAction(() => {
      this.pattern.reactions[reactionIndex].condition.transform?.eventDataTemplate?.advice?.template?.interactions
        .at(interactionIndex)
        ?.interaction.content.splice(contentIndex, 1);
    });

    this.updatePattern({ [path]: content });
  }

  removeReaction(id: number) {
    const reactions = this.pattern.reactions;
    runInAction(() => {
      this.pattern.reactions.splice(id, 1);
    });

    this.updatePattern({ ['reactions']: reactions });
  }
  private getUserId(): string {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw new Error('User ID not found');
    return userId;
  }

  private getPatternId(): string {
    const patternId = this.pattern.id;
    if (!patternId) throw new Error('Pattern ID not found');
    return patternId;
  }
}
