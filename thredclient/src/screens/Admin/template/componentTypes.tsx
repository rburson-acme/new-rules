import { Text } from './Text';
import { Input } from './Input';
import { Value } from './Value';
import { Image } from './Image';
import { Interaction } from './Interaction';
import { Group } from './Group';

export function getComponentTypes() {
  return {
    interaction: Interaction,
    group: Group,
    input: Input,
    value: Value,
    text: Text,
    image: Image,
  };
}
