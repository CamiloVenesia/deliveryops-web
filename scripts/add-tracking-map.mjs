
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(
    process.cwd(),
    'src/pages/TrackingPage.jsx'
);

const importTarget =
    "import OperationTimeline from '../components/OperationTimeline.jsx';";

const importReplacement = `${importTarget}
import DeliveryRouteMap from '../components/DeliveryRouteMap.jsx';`;

const target =
    '                                {locationsQuery.isError ? (';

const replacement = `                                {!locationsQuery.isError && (
                                    <DeliveryRouteMap
                                        currentLocation={current}
                                        locationHistory={history}
                                    />
                                )}

${target}`;

function replaceOnce(content, search, value, label) {
    const occurrences = content.split(search).length - 1;

    if (occurrences !== 1) {
        throw new Error(
            `${label}: se esperaba una coincidencia, encontradas ${occurrences}`
        );
    }

    return content.replace(search, value);
}

try {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            'No se encontró TrackingPage.jsx. Ejecutá el script desde deliveryops-web.'
        );
    }

    const original = fs.readFileSync(filePath, 'utf8');

    if (original.includes('DeliveryRouteMap')) {
        console.log('El mapa ya está integrado.');
        process.exit(0);
    }

    let updated = replaceOnce(
        original,
        importTarget,
        importReplacement,
        'Import del mapa'
    );

    updated = replaceOnce(
        updated,
        target,
        replacement,
        'Ubicación del mapa en Seguimiento'
    );

    fs.writeFileSync(filePath, updated, 'utf8');

    console.log(
        'Mapa GPS integrado correctamente en TrackingPage.jsx.'
    );
} catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
}
