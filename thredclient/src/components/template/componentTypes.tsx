import { Input } from './Input';
import { Image } from './Image';
import { Interaction } from './Interaction';
import { Group } from './Group';
import { Text } from './Text';

export function getComponentTypes() {
  return {
    interaction: Interaction,
    group: Group,
    input: Input,
    text: Text,
    image: Image,
  };
}
