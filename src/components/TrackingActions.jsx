
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    ClipboardCheck,
    LocateFixed,
    Navigation
} from 'lucide-react';

import { deliveryLogisticsService } from '../api/logistics.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useToast } from './useToast.js';

import { Button, Card } from './ui.jsx';
import DeliveryProofCapture from './DeliveryProofCapture.jsx';

const INCIDENTS = [
    ['recipient_absent', 'Destinatario ausente'],
    ['rejected', 'Entrega rechazada'],
    ['invalid_address', 'Dirección incorrecta'],
    ['access_problem', 'Problemas de acceso'],
    ['rescheduled', 'Reprogramada'],
    ['other', 'Otro inconveniente']
];

function Heading({ icon: Icon, title, description }) {
    return (
        <div className="tracking-section-heading">
            <span className="tracking-section-icon">
                <Icon size={19} />
            </span>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function TrackingActions({
    id,
    status,
    proof,
    trackingCode,
    refresh
}) {
    const { pushToast } = useToast();

    const [gps, setGps] = useState({
        latitude: '',
        longitude: '',
        source: 'manual'
    });

    const [locating, setLocating] = useState(false);

    const [attempt, setAttempt] = useState({
        outcome: 'recipient_absent',
        notes: ''
    });

    const canReport = ['assigned', 'in_transit'].includes(status);

    function failure(error) {
        pushToast({
            type: 'error',
            title: 'No se pudo guardar',
            message: getApiErrorMessage(
                error,
                error.message || 'Verificá los datos e intentá nuevamente.'
            )
        });
    }

    function success(message) {
        pushToast({ title: message });
        refresh();
    }

    const gpsMutation = useMutation({
        mutationFn: payload =>
            deliveryLogisticsService.recordLocation(id, payload),
        onSuccess: () => success('Ubicación GPS registrada'),
        onError: failure
    });

    const attemptMutation = useMutation({
        mutationFn: payload =>
            deliveryLogisticsService.recordAttempt(id, payload),
        onSuccess: () => {
            setAttempt({
                outcome: 'recipient_absent',
                notes: ''
            });

            success('Incidencia registrada');
        },
        onError: failure
    });

    function useCurrentPosition() {
        if (!navigator.geolocation) {
            failure(new Error('Este navegador no admite geolocalización.'));
            return;
        }

        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            position => {
                setGps({
                    latitude: String(position.coords.latitude),
                    longitude: String(position.coords.longitude),
                    source: 'gps'
                });

                setLocating(false);
            },
            error => {
                setLocating(false);
                failure(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            }
        );
    }

    function submitGps(event) {
        event.preventDefault();

        const latitude = Number(gps.latitude);
        const longitude = Number(gps.longitude);

        if (
            !gps.latitude.trim() ||
            !gps.longitude.trim() ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
        ) {
            failure(new Error('Ingresá coordenadas válidas.'));
            return;
        }

        gpsMutation.mutate({
            latitude,
            longitude,
            source: gps.source
        });
    }

    function submitAttempt(event) {
        event.preventDefault();

        attemptMutation.mutate({
            outcome: attempt.outcome,
            ...(attempt.notes.trim()
                ? { notes: attempt.notes.trim() }
                : {})
        });
    }

    return (
        <div className="tracking-operations">
            <Card className="tracking-card">
                <Heading
                    icon={LocateFixed}
                    title="Registrar ubicación"
                    description="Actualizar la posición registrada de esta entrega."
                />

                <form className="tracking-form" onSubmit={submitGps}>
                    <div className="tracking-form-grid">
                        <label>
                            Latitud
                            <input
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                required
                                value={gps.latitude}
                                disabled={!canReport}
                                placeholder="-32.9468"
                                onChange={event =>
                                    setGps(value => ({
                                        ...value,
                                        latitude: event.target.value,
                                        source: 'manual'
                                    }))
                                }
                            />
                        </label>

                        <label>
                            Longitud
                            <input
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                required
                                value={gps.longitude}
                                disabled={!canReport}
                                placeholder="-60.6393"
                                onChange={event =>
                                    setGps(value => ({
                                        ...value,
                                        longitude: event.target.value,
                                        source: 'manual'
                                    }))
                                }
                            />
                        </label>
                    </div>

                    <div className="tracking-form-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            icon={Navigation}
                            disabled={!canReport || locating}
                            onClick={useCurrentPosition}
                        >
                            {locating ? 'Obteniendo GPS...' : 'Mi ubicación'}
                        </Button>

                        <Button
                            type="submit"
                            loading={gpsMutation.isPending}
                            disabled={!canReport}
                        >
                            Guardar ubicación
                        </Button>
                    </div>

                    <p className="tracking-hint">
                        El navegador solicitará permiso para acceder
                        al GPS. Fuera de localhost necesita HTTPS.
                    </p>
                </form>
            </Card>

            <Card className="tracking-card">
                <Heading
                    icon={ClipboardCheck}
                    title="Registrar incidencia"
                    description="Documentar intentos fallidos e inconvenientes."
                />

                <form className="tracking-form" onSubmit={submitAttempt}>
                    <label>
                        Motivo
                        <select
                            value={attempt.outcome}
                            disabled={!canReport}
                            onChange={event =>
                                setAttempt(current => ({
                                    ...current,
                                    outcome: event.target.value
                                }))
                            }
                        >
                            {INCIDENTS.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Descripción
                        <textarea
                            rows={3}
                            maxLength={1000}
                            value={attempt.notes}
                            disabled={!canReport}
                            placeholder="Describí lo ocurrido..."
                            onChange={event =>
                                setAttempt(current => ({
                                    ...current,
                                    notes: event.target.value
                                }))
                            }
                        />
                    </label>

                    <Button
                        type="submit"
                        disabled={!canReport}
                        loading={attemptMutation.isPending}
                    >
                        Registrar incidencia
                    </Button>
                </form>
            </Card>

            <DeliveryProofCapture
                deliveryId={id}
                status={status}
                trackingCode={trackingCode}
                proof={proof}
                onRefresh={refresh}
            />
        </div>
    );
}
