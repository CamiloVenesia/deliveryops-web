
import {
    Box,
    CircleDollarSign,
    ContactRound,
    MapPin,
    Route,
    Truck
} from 'lucide-react';

import {
    formatDateTime,
    formatMoney,
    getEntityId,
    shortId
} from '../utils/formatters.js';

import '../styles/shipment-polish.css';

function Fact({ label, value }) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return (
        <div className="shipment-fact">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function Group({ icon: Icon, title, children }) {
    return (
        <section className="shipment-fact-group">
            <h3>
                <Icon size={17} />
                {title}
            </h3>
            <div className="shipment-fact-grid">
                {children}
            </div>
        </section>
    );
}

function addressExtra(address = {}) {
    const parts = [
        address.neighborhood,
        address.floor ? `Piso ${address.floor}` : null,
        address.unit ? `Depto. ${address.unit}` : null,
        address.postalCode ? `CP ${address.postalCode}` : null
    ];

    return parts.filter(Boolean).join(' · ');
}

export function OrderLogisticsSummary({ order }) {
    if (!order) return null;

    const recipient = order.recipient ?? {};
    const packageInfo = order.packageInfo ?? {};
    const shippingCost = order.shippingCost ?? {};
    const address = order.deliveryAddressDetails ?? {};

    return (
        <div className="shipment-summary">
            <Group icon={ContactRound} title="Destinatario de la entrega">
                <Fact
                    label="Recibe"
                    value={recipient.fullName || 'No informado'}
                />
                <Fact label="Teléfono" value={recipient.phone} />
                <Fact label="Email" value={recipient.email} />
                <Fact
                    label="Entrega sin contacto"
                    value={order.contactlessDelivery ? 'Sí' : 'No'}
                />
            </Group>

            <Group icon={MapPin} title="Datos de destino">
                <Fact
                    label="Dirección"
                    value={order.deliveryAddress}
                />
                <Fact
                    label="Información adicional"
                    value={addressExtra(address)}
                />
                <Fact
                    label="Instrucciones para el repartidor"
                    value={order.deliveryInstructions}
                />
                <Fact
                    label="Depósito de origen"
                    value={
                        order.originDepot?.name ||
                        (order.originDepot
                            ? shortId(getEntityId(order.originDepot))
                            : 'No asignado')
                    }
                />
            </Group>

            <Group icon={Box} title="Paquete y preparación">
                <Fact
                    label="Bultos"
                    value={packageInfo.packageCount}
                />
                <Fact
                    label="Peso total"
                    value={
                        packageInfo.totalWeightKg != null
                            ? `${packageInfo.totalWeightKg} kg`
                            : null
                    }
                />
                <Fact
                    label="Frágil"
                    value={packageInfo.fragile ? 'Sí' : 'No'}
                />
                <Fact
                    label="Requiere firma"
                    value={packageInfo.requiresSignature ? 'Sí' : 'No'}
                />
            </Group>

            <Group icon={CircleDollarSign} title="Información comercial">
                <Fact
                    label="Costo de envío"
                    value={
                        shippingCost.total != null
                            ? `${formatMoney(shippingCost.total)} ${shippingCost.currency || 'ARS'}`
                            : 'No registrado'
                    }
                />
                <Fact
                    label="Fecha solicitada"
                    value={order.requestedDeliveryAt
                        ? formatDateTime(order.requestedDeliveryAt)
                        : null}
                />
                <Fact
                    label="Entrega estimada"
                    value={order.estimatedDeliveryAt
                        ? formatDateTime(order.estimatedDeliveryAt)
                        : null}
                />
            </Group>
        </div>
    );
}

export function DeliveryLogisticsSummary({ delivery, order }) {
    if (!delivery) return null;

    const route = delivery.route ?? {};
    const vehicle = delivery.vehicle ?? {};
    const costs = delivery.costs ?? {};
    const proof = delivery.proofOfDelivery ?? {};

    return (
        <div className="shipment-summary">
            <Group icon={Truck} title="Operación de reparto">
                <Fact
                    label="Vehículo"
                    value={vehicle.type || 'No informado'}
                />
                <Fact label="Patente" value={vehicle.plate} />
                <Fact
                    label="Código de seguimiento"
                    value={delivery.trackingCode}
                />
                <Fact
                    label="Destinatario"
                    value={order?.recipient?.fullName}
                />
            </Group>

            <Group icon={Route} title="Ruta y ubicación">
                <Fact
                    label="Distancia estimada"
                    value={
                        route.distanceKm != null
                            ? `${route.distanceKm} km`
                            : null
                    }
                />
                <Fact
                    label="Duración estimada"
                    value={
                        route.estimatedDurationMinutes != null
                            ? `${route.estimatedDurationMinutes} min`
                            : null
                    }
                />
                <Fact
                    label="Registros GPS"
                    value={delivery.locationHistory?.length ?? 0}
                />
                <Fact
                    label="Entrega estimada"
                    value={
                        delivery.estimatedDeliveryAt
                            ? formatDateTime(delivery.estimatedDeliveryAt)
                            : null
                    }
                />
            </Group>

            <Group icon={CircleDollarSign} title="Costos y recepción">
                <Fact
                    label="Costo operativo previsto"
                    value={
                        costs.plannedCost != null
                            ? `${formatMoney(costs.plannedCost)} ${costs.currency || 'ARS'}`
                            : null
                    }
                />
                <Fact
                    label="Costo operativo registrado"
                    value={
                        costs.totalActualCost != null
                            ? `${formatMoney(costs.totalActualCost)} ${costs.currency || 'ARS'}`
                            : null
                    }
                />
                <Fact
                    label="Recibido por"
                    value={proof.receivedBy}
                />
                <Fact
                    label="Comprobante registrado"
                    value={
                        proof.receivedAt
                            ? formatDateTime(proof.receivedAt)
                            : 'No registrado'
                    }
                />
            </Group>
        </div>
    );
}
