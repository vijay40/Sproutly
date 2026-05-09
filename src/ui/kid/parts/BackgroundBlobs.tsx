import { View } from 'react-native';
import { blobs } from '../theme';

export function BackgroundBlobs() {
  return (
    <>
      {blobs.map((b, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: b.color,
            opacity: b.opacity,
          }}
        />
      ))}
    </>
  );
}
