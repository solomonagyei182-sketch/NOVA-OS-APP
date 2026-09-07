import { WifiOff } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useConnectionStatus } from './ConnectionStatusContext';

// Silent when connected (the common case) — only surfaces when there is
// something the user actually needs to know: live updates have paused.
export function ConnectionStatus() {
  const isConnected = useConnectionStatus();
  if (isConnected) return null;

  return (
    <Badge tone="warning">
      <WifiOff size={12} />
      Reconnecting…
    </Badge>
  );
}
