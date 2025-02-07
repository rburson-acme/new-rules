import { Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Bubble } from '../common/Bubble';

type VideoProps = {
  uri: string;
};
export const Video = ({ uri }: VideoProps) => {
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
  });

  return (
    <Bubble style={{ flex: 1 }}>
      <VideoView
        style={{
          width: 280,
        }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    </Bubble>
  );
};
