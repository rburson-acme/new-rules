import { Input } from './Input';
import { Image } from './Image';
import { Interaction } from './Interaction';
import { Group } from './Group';
import { Text } from './Text';
import { Video } from './Video';
import { Map } from './Map/Map';

export function getComponentTypes() {
  return {
    interaction: Interaction,
    group: Group,
    input: Input,
    text: Text,
    image: Image,
    video: Video,
    map: Map,
  };
}
