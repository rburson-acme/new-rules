import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { ElementModel } from 'thredlib';
import { MediumText } from '../../common/MediumText';
import { PatternInput } from './PatternInput';
import { DropdownData } from '../../common/Dropdown';
import { TextInputContent } from './TextInputContent';
import { RegularText } from '../../common/RegularText';
import { EditableInput } from '../../common/EditableInput';

type ContentProps = {
  content: ElementModel;
  patternStore: PatternStore;
  index: number;
  pathSoFar: string;
};

const textDropdownOptions: DropdownData[] = [
  { display: 'Boolean', value: 'boolean' },
  { display: 'Text', value: 'text' },
  { display: 'Numeric', value: 'numeric' },
  { display: 'Nominal', value: 'nominal' },
];

export const Content = observer(({ content, index, pathSoFar, patternStore }: ContentProps) => {
  const type = (Object.keys(content).find(k => content[k as keyof ElementModel]) ?? 'unknown') as keyof ElementModel;

  switch (type) {
    case 'group':
      return (
        <View style={styles.interactionContainer}>
          <MediumText>Group Items:</MediumText>
          {content.group?.items.map((item, index) => {
            return <Content key={index} content={item} index={index} patternStore={patternStore} pathSoFar="" />;
          })}
          {/* <InteractionPicker
            interactionIndex={interactionIndex}
            patternStore={patternStore}
            reactionIndex={reactionIndex}
          /> */}
          {/* TODO: Figure out a way to allow for 'recursive' groups */}
        </View>
      );
    case 'input':
      if (!content.input) return;

      return (
        <View style={styles.interactionContainer}>
          <PatternInput
            name="Name"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.input.name`}
            value={content.input?.name}
          />
          <PatternInput
            name="Display"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.input.display`}
            value={content.input?.display}
          />
          <View style={styles.dropdownContainer}>
            <RegularText>Type: </RegularText>
            <EditableInput
              type="dropdown"
              selectedItem={textDropdownOptions.find(i => i.value === content.input?.type) || textDropdownOptions[0]}
              items={textDropdownOptions}
              onSubmit={text => {
                patternStore.updatePattern({ [`${pathSoFar}.input.type`]: text });
              }}
              onItemChange={item => {
                patternStore.updatePatternValue(`${pathSoFar}.input.type`, item.value);
              }}
            />
            {/* // TODO: When changing the type, clear out the other fields
            // When changing to boolean, set the set to have two items
            // [0]: { display: 'True', value: true }
            // [1]: { display: 'False', value: false } */}
          </View>
          <TextInputContent pathSoFar={`${pathSoFar}.input`} patternStore={patternStore} textInput={content.input} />
        </View>
      );
    case 'map':
      if (!content.map) return;
      return (
        <>
          <MediumText>Map</MediumText>
          <View style={styles.interactionContainer}>
            <MediumText>Locations:</MediumText>
            {content.map.locations.map((location, index) => {
              return (
                <View style={styles.interactionContainer} key={index}>
                  <PatternInput
                    name="name"
                    patternStore={patternStore}
                    updatePath={`${pathSoFar}.map.locations.${index}.name`}
                    value={location.name}
                  />
                  <PatternInput
                    name="latitude"
                    patternStore={patternStore}
                    updatePath={`${pathSoFar}.map.locations.${index}.latitude`}
                    value={location.latitude}
                  />
                  <PatternInput
                    name="longitude"
                    patternStore={patternStore}
                    updatePath={`${pathSoFar}.map.locations.${index}.longitude`}
                    value={location.longitude}
                  />
                </View>
              );
            })}
          </View>
        </>
      );
    case 'image':
      if (!content.image) return;
      return (
        <View style={styles.interactionContainer}>
          <PatternInput
            name="URI"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.image.uri`}
            value={content.image.uri}
          />
          <PatternInput
            name="Height"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.image.height`}
            value={content.image.height.toString()}
            numeric
          />
          <PatternInput
            name="Width"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.image.width`}
            value={content.image.width.toString()}
            numeric
          />
        </View>
      );
    case 'text':
      if (!content.text) return;
      return (
        <View style={styles.interactionContainer}>
          <PatternInput
            name="Width"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.text.value`}
            value={content.text.value}
            numeric
          />
        </View>
      );
    case 'video':
      if (!content.video) return;
      return (
        <View style={styles.interactionContainer}>
          <PatternInput
            name="URI"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.video.uri`}
            value={content.video.uri}
          />
        </View>
      );
  }
});

const styles = StyleSheet.create({
  interactionContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
