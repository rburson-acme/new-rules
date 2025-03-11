import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';

type VideoProps = {
  uri: string;
};
export const Video = ({ uri }: VideoProps) => {
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
  });

  return (
    <View>
      <VideoView
        style={{
          width: 210,
          height: 120,
          borderRadius: 8,
        }}
        contentFit="contain"
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
};
