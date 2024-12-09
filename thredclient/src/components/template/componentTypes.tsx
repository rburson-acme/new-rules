import { Input } from './Input';
import { Image } from './Image';
import { Interaction } from './Interaction';
import { Group } from './Group';
import { Value } from './Value';
import { Text } from './Text';

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
