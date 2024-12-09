import { Text } from '../../../components/template/Text';
import { Input } from './Input';
import { Value } from './Value';
import { Image } from './Image';
import { Interaction } from './Interaction';
import { Group } from './Group';

export const getComponentTypes = () => {
  return {
    interaction: Interaction,
    group: Group,
    input: Input,
    value: Value,
    text: Text,
    image: Image,
  };
};
