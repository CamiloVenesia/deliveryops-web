
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const orderFile = path.join(
    root, 'src/pages/OrdersPage.jsx'
);

const deliveryFile = path.join(
    root, 'src/pages/DeliveriesPage.jsx'
);

function one(source, pattern, replacement, label) {
    const flags = pattern.flags.includes('g')
        ? pattern.flags
        : pattern.flags + 'g';

    const matches = [
        ...source.matchAll(new RegExp(pattern.source, flags))
    ];

    if (matches.length !== 1) {
        throw new Error(
            `${label}: se esperaba 1 coincidencia, ` +
            `pero se encontraron ${matches.length}.`
        );
    }

    return source.replace(pattern, replacement);
}

function upgradeOrders(source) {
    source = one(
        source,
        /import\s+OperationTimeline\s+from\s+'\.\.\/components\/OperationTimeline\.jsx';/,
        match => `${match}
import ShipmentCode from '../components/ShipmentCode.jsx';
import OrderRecipientFields, {
    INITIAL_RECIPIENT,
    buildRecipientLogistics
} from '../components/OrderRecipientFields.jsx';
import {
    OrderLogisticsSummary
} from '../components/ShipmentLogisticsSummary.jsx';`,
        'Importaciones de pedidos'
    );

    source = one(
        source,
        /<strong>\s*#\s*\{shortId\(\s*id\s*\)\}\s*<\/strong>/,
        '<ShipmentCode record={order} label="Pedido" />',
        'Código comercial de pedido'
    );

    source = one(
        source,
        /<td\s+className="table-address">\s*\{order\.deliveryAddress\s*\?\?\s*'—'\}\s*<\/td>/,
        `<td className="table-address">
    <div className="shipment-destination">
        <strong>{order.deliveryAddress ?? '—'}</strong>
        {order.recipient?.fullName && (
            <span>Recibe: {order.recipient.fullName}</span>
        )}
    </div>
</td>`,
        'Destinatario en listado de pedidos'
    );

    source = one(
        source,
        /const\s*\[\s*deliveryAddress\s*,\s*setDeliveryAddress\s*\]\s*=\s*useState\(\s*''\s*\);/,
        match => `${match}
const [recipient, setRecipient] = useState({
    ...INITIAL_RECIPIENT
});`,
        'Estado para destinatario'
    );

    source = one(
        source,
        /function reset\(\)\s*\{/,
        match => `${match}
    setRecipient({ ...INITIAL_RECIPIENT });`,
        'Reinicio de formulario'
    );

    source = one(
        source,
        /const payload\s*=\s*\{/,
        match => `${match}
    ...buildRecipientLogistics(recipient),`,
        'Datos de creación del pedido'
    );

    source = one(
        source,
        /<div className="form-grid form-grid--2">/,
        match => `<OrderRecipientFields
    value={recipient}
    onChange={setRecipient}
/>
${match}`,
        'Formulario de destinatario'
    );

    source = one(
        source,
        /(<span className="form-label">\s*)Cliente \/ destinatario/,
        (_match, head) =>
            `${head}Cliente que solicita el envío`,
        'Etiqueta de selección del cliente'
    );

    source = one(
        source,
        /Seleccionar cliente \/ destinatario/,
        'Seleccionar cliente',
        'Selector de cliente'
    );

    source = one(
        source,
        /label="Cliente \/ destinatario"/,
        'label="Cliente (titular)"',
        'Detalle del cliente'
    );

    source = one(
        source,
        /(function OrderDetailsModal\([\s\S]*?)(<div className="detail-grid">)/,
        (_match, head, tail) =>
            `${head}<OrderLogisticsSummary order={currentOrder} />
${tail}`,
        'Resumen logístico del pedido'
    );

    source = one(
        source,
        /title=\{`Pedido #\$\{shortId\(\s*currentOrder\s*\)\}`\}/,
        'title={currentOrder?.trackingCode ? `Pedido ${currentOrder.trackingCode}` : `Pedido #${shortId(currentOrder)}`}',
        'Título comercial del pedido'
    );

    source = one(
        source,
        /<strong>\s*Pedido #\s*\{shortId\(\s*currentOrder\s*\)\}\s*<\/strong>/,
        '<strong>Pedido {currentOrder.trackingCode || `#${shortId(currentOrder)}`}</strong>',
        'Identidad comercial del pedido'
    );

    source = one(
        source,
        /status="delivered"/,
        'status={currentOrder.status}',
        'Estado asociado al comprobante'
    );

    return source;
}

function upgradeDeliveries(source) {
    source = one(
        source,
        /import\s+OperationTimeline\s+from\s+'\.\.\/components\/OperationTimeline\.jsx';/,
        match => `${match}
import ShipmentCode from '../components/ShipmentCode.jsx';
import {
    DeliveryLogisticsSummary
} from '../components/ShipmentLogisticsSummary.jsx';`,
        'Importaciones de entregas'
    );

    source = one(
        source,
        /<strong>\s*#\s*\{shortId\(\s*id\s*\)\}\s*<\/strong>/,
        '<ShipmentCode record={delivery} label="Entrega" />',
        'Código comercial de entrega'
    );

    source = one(
        source,
        /<strong>\s*#\s*\{shortId\(\s*orderId\s*\)\}\s*<\/strong>/,
        '<strong>{order?.trackingCode || `#${shortId(orderId)}`}</strong>',
        'Pedido asociado a entrega'
    );

    source = one(
        source,
        /(function DeliveryDetailsModal\([\s\S]*?)(<div className="detail-grid">)/,
        (_match, head, tail) =>
            `${head}<DeliveryLogisticsSummary
    delivery={currentDelivery}
    order={currentOrder}
/>
${tail}`,
        'Resumen operativo de entrega'
    );

    source = one(
        source,
        /title=\{`Entrega #\$\{shortId\(\s*currentDelivery\s*\)\}`\}/,
        'title={currentDelivery?.trackingCode ? `Entrega ${currentDelivery.trackingCode}` : `Entrega #${shortId(currentDelivery)}`}',
        'Título comercial de entrega'
    );

    source = one(
        source,
        /<strong>\s*Entrega #\s*\{shortId\(\s*currentDelivery\s*\)\}\s*<\/strong>/,
        '<strong>Entrega {currentDelivery.trackingCode || `#${shortId(currentDelivery)}`}</strong>',
        'Identidad comercial de entrega'
    );

    source = one(
        source,
        /status="delivered"/,
        'status={currentDelivery.status}',
        'Estado asociado al comprobante'
    );

    return source;
}

try {
    if (!fs.existsSync(orderFile) || !fs.existsSync(deliveryFile)) {
        throw new Error(
            'Ejecutá este script desde la raíz de deliveryops-web.'
        );
    }

    const originalOrders = fs.readFileSync(orderFile, 'utf8');
    const originalDeliveries = fs.readFileSync(deliveryFile, 'utf8');

    if (
        originalOrders.includes('OrderLogisticsSummary') ||
        originalDeliveries.includes('DeliveryLogisticsSummary')
    ) {
        throw new Error(
            'Las mejoras ya fueron aplicadas. No ejecutes el script otra vez.'
        );
    }

    const updatedOrders = upgradeOrders(originalOrders);
    const updatedDeliveries = upgradeDeliveries(originalDeliveries);

    // Validamos ambos archivos antes de escribir cualquiera.
    fs.writeFileSync(orderFile, updatedOrders);
    fs.writeFileSync(deliveryFile, updatedDeliveries);

    console.log(
        'Actualización completada: Pedidos y Entregas profesionalizados.'
    );
} catch (error) {
    console.error(`Actualización detenida: ${error.message}`);
    process.exitCode = 1;
}
