import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      // Emulators often report isInternetReachable=false even when 10.0.2.2 works.
      setOnline(state.isConnected !== false);
    });
    return () => sub();
  }, []);

  return { online };
}
