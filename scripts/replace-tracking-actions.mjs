
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(
    process.cwd(),
    'src/pages/TrackingPage.jsx'
);

function replaceExactlyOnce(content, pattern, replacement, label) {
    const matches = [...content.matchAll(
        new RegExp(
            pattern.source,
            pattern.flags.includes('g')
                ? pattern.flags
                : `${pattern.flags}g`
        )
    )];

    if (matches.length !== 1) {
        throw new Error(
            `${label}: esperaba 1 coincidencia, encontré ${matches.length}`
        );
    }

    return content.replace(pattern, replacement);
}

try {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            'No se encontró TrackingPage.jsx. Ejecutá el script desde deliveryops-web.'
        );
    }

    let source = fs.readFileSync(filePath, 'utf8');

    if (source.includes("from '../components/TrackingActions.jsx'")) {
        console.log('Los nuevos formularios ya están integrados.');
        process.exit(0);
    }

    const start = source.indexOf('function TrackingOperations(');
    const end = source.indexOf('export default function TrackingPage()');

    if (start < 0 || end < 0 || end <= start) {
        throw new Error(
            'La estructura de TrackingPage.jsx es diferente de la esperada.'
        );
    }

    const oldComponent = source.slice(start, end);

    if (
        !oldComponent.includes('function submitProof(') ||
        !oldComponent.includes('function submitGps(') ||
        !oldComponent.includes('function submitAttempt(')
    ) {
        throw new Error(
            'No se identificaron correctamente los formularios anteriores.'
        );
    }

    // Quitar el componente anterior conservando la página principal.
    source = source.slice(0, start) + source.slice(end);

    source = replaceExactlyOnce(
        source,
        /import\s*\{\s*useMutation\s*,\s*useQuery\s*,\s*useQueryClient\s*\}\s*from\s*['"]@tanstack\/react-query['"];?/,
        "import { useQuery, useQueryClient } from '@tanstack/react-query';",
        'Importaciones de React Query'
    );

    source = replaceExactlyOnce(
        source,
        /import\s*\{\s*useToast\s*\}\s*from\s*['"]\.\.\/components\/useToast\.js['"];?\r?\n/,
        '',
        'Importación de toast'
    );

    // Iconos que estaban reservados para el formulario anterior.
    for (const icon of ['LocateFixed', 'Navigation', 'UploadCloud']) {
        source = replaceExactlyOnce(
            source,
            new RegExp(`^\\s*${icon},?\\r?\\n`, 'm'),
            '\n',
            `Icono ${icon}`
        );
    }

    source = replaceExactlyOnce(
        source,
        /import OperationTimeline from ['"]\.\.\/components\/OperationTimeline\.jsx['"];?/,
        match => `${match}
import TrackingActions from '../components/TrackingActions.jsx';`,
        'Importación del nuevo formulario'
    );

    source = replaceExactlyOnce(
        source,
        /<TrackingOperations\b/,
        '<TrackingActions',
        'Uso del formulario antiguo'
    );

    source = replaceExactlyOnce(
        source,
        /(<TrackingActions\b[\s\S]*?\bproof=\{proof\})/,
        match => `${match}
                                    trackingCode={delivery?.trackingCode}`,
        'Código de seguimiento del formulario'
    );

    fs.writeFileSync(filePath, source, 'utf8');

    console.log(
        'Seguimiento actualizado: GPS, incidencias y captura profesional de comprobantes.'
    );
} catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
}
