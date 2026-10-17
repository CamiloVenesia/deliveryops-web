
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(
    process.cwd(),
    'src/pages/TrackingPage.jsx'
);

try {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            'No se encontró TrackingPage.jsx. Ejecutá el script desde deliveryops-web.'
        );
    }

    const source = fs.readFileSync(filePath, 'utf8');

    const iconImportPattern =
        /import\s*\{([^{}]*)\}\s*from\s*['"]lucide-react['"];?/g;

    const matches = [...source.matchAll(iconImportPattern)];

    if (matches.length !== 1) {
        throw new Error(
            `Se esperaba una importación de lucide-react y se encontraron ${matches.length}.`
        );
    }

    const originalImport = matches[0][0];
    const importedIcons = matches[0][1]
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);

    if (importedIcons.includes('Navigation')) {
        console.log('El icono Navigation ya está importado.');
        process.exit(0);
    }

    if (!source.includes('<Navigation ')) {
        throw new Error(
            'No se encontró el componente Navigation esperado. No se modificó el archivo.'
        );
    }

    const updatedIcons = [
        ...importedIcons,
        'Navigation'
    ].sort((a, b) => a.localeCompare(b));

    const correctedImport = `import {
${updatedIcons.map(icon => `    ${icon}`).join(',\n')}
} from 'lucide-react';`;

    const updatedSource = source.replace(
        originalImport,
        correctedImport
    );

    fs.writeFileSync(filePath, updatedSource, 'utf8');

    console.log(
        'CORREGIDO: icono Navigation importado correctamente desde lucide-react.'
    );
} catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
}
