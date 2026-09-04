import { useState } from 'react';
import { MapPin, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useAcceptStock } from './hooks';
import { captureLocation, reverseGeocode, type GeolocationResult } from '../../lib/geolocation';
import type { StockTransfer } from '../../lib/types';

type Phase = 'idle' | 'requesting' | 'captured' | 'error';

export function AcceptStockModal({
  transfer,
  onClose,
}: {
  transfer: StockTransfer | null;
  onClose: () => void;
}) {
  const acceptStock = useAcceptStock();
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  function resetState() {
    setPhase('idle');
    setErrorMessage(null);
    setLocation(null);
    setAddress(null);
    setResolvingAddress(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function requestLocation() {
    setPhase('requesting');
    setErrorMessage(null);
    try {
      const result = await captureLocation();
      setLocation(result);
      setPhase('captured');
      setResolvingAddress(true);
      const resolved = await reverseGeocode(result.latitude, result.longitude);
      setAddress(resolved);
      setResolvingAddress(false);
    } catch (err) {
      setPhase('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not get your location. Please try again.');
    }
  }

  async function confirmAcceptance() {
    if (!transfer || !location) return;
    try {
      await acceptStock.mutateAsync({
        id: transfer.id,
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracyMeters,
          address: address ?? undefined,
        },
      });
      handleClose();
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  return (
    <Modal open={Boolean(transfer)} onClose={handleClose} title="Accept incoming stock">
      {transfer && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg-subtle">{transfer.transferId}</span>
            </div>
            <div className="mt-1 text-base font-semibold text-fg">{transfer.product.name}</div>
            <div className="mt-0.5 text-fg-muted">
              Quantity: <span className="font-medium text-fg">{transfer.quantity}</span>
            </div>
            <div className="mt-0.5 text-xs text-fg-subtle">Dispatched by {transfer.dispatchedBy.name}</div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
              <MapPin size={16} className="text-brand-500" />
              Live location required
            </div>
            <p className="mb-3 text-xs text-fg-subtle">
              Nova needs to confirm where you physically are to complete this acceptance. Your device will ask for
              location permission — this cannot be entered manually.
            </p>

            {phase === 'idle' && (
              <Button type="button" variant="secondary" onClick={requestLocation} className="w-full">
                <MapPin size={16} />
                Share my location
              </Button>
            )}

            {phase === 'requesting' && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-surface-2 py-3 text-sm text-fg-muted">
                <Loader2 size={16} className="animate-spin" />
                Waiting for your device's location…
              </div>
            )}

            {phase === 'error' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 rounded-lg border border-danger-tint bg-danger-tint px-3.5 py-2.5 text-sm text-danger-tint-fg">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <Button type="button" variant="secondary" onClick={requestLocation} className="w-full">
                  Try again
                </Button>
              </div>
            )}

            {phase === 'captured' && location && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 rounded-lg border border-success-tint bg-success-tint px-3.5 py-2.5 text-sm text-success-tint-fg">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Location captured</div>
                    <div className="text-xs opacity-90">
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} (±
                      {Math.round(location.accuracyMeters)}m)
                    </div>
                    {resolvingAddress ? (
                      <div className="mt-0.5 text-xs opacity-75">Looking up address…</div>
                    ) : address ? (
                      <div className="mt-0.5 text-xs opacity-90">{address}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={confirmAcceptance}
            disabled={phase !== 'captured'}
            loading={acceptStock.isPending}
            className="w-full"
          >
            Confirm acceptance
          </Button>
        </div>
      )}
    </Modal>
  );
}
