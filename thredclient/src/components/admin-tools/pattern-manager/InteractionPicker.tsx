import { observer, useLocalObservable } from 'mobx-react-lite';
import { View } from 'react-native';
import { Button } from '../../common/Button';
import { ContentType, PatternStore } from '@/src/stores/PatternStore';
import { Dropdown } from '../../common/Dropdown';

type LocalState = {
  selectedNewContent: DropdownData;
};
type DropdownData = {
  display: string;
  value: ContentType;
};

const dropdownData: DropdownData[] = [
  { display: 'Boolean Input', value: 'booleanInput' },
  { display: 'Number Input', value: 'numericInput' },
  { display: 'Text Input', value: 'textInput' },
  { display: 'Nominal Input', value: 'nominalInput' },
  { display: 'Text', value: 'text' },
  { display: 'Image', value: 'image' },
  { display: 'Map', value: 'map' },
  { display: 'Video', value: 'video' },
  { display: 'Group', value: 'group' },
];

type InteractionPickerProps = {
  reactionIndex: number;
  interactionIndex: number;
  patternStore: PatternStore;
};
export const InteractionPicker = observer(
  ({ interactionIndex, reactionIndex, patternStore }: InteractionPickerProps) => {
    const locals = useLocalObservable<LocalState>(() => ({
      selectedNewContent: { display: 'Text Input', value: 'textInput' },
    }));

    return (
      <View style={{ gap: 16 }}>
        <Dropdown
          data={dropdownData}
          style={{ width: 200, alignSelf: 'center' }}
          onChange={data => {
            locals.selectedNewContent = data;
          }}
          defaultItem={locals.selectedNewContent}
        />

        <Button
          content={'Add selected content'}
          onPress={() => {
            patternStore.addInteractionContent(locals.selectedNewContent.value, interactionIndex, reactionIndex);
          }}
        />
      </View>
    );
  },
);
