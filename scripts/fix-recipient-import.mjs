
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(
    process.cwd(),
    'src/pages/OrdersPage.jsx'
);

const previousImport =
    /import\s+OrderRecipientFields\s*,\s*\{\s*INITIAL_RECIPIENT\s*,\s*buildRecipientLogistics\s*\}\s*from\s*['"]\.\.\/components\/OrderRecipientFields\.jsx['"];?/;

const newImport = `import OrderRecipientFields from '../components/OrderRecipientFields.jsx';
import {
    INITIAL_RECIPIENT,
    buildRecipientLogistics
} from '../utils/orderRecipient.js';`;

try {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            'No se encontró src/pages/OrdersPage.jsx. Ejecutá el script desde deliveryops-web.'
        );
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (previousImport.test(content)) {
        const updated = content.replace(
            previousImport,
            newImport
        );

        fs.writeFileSync(
            filePath,
            updated,
            'utf8'
        );

        console.log(
            'Imports de OrdersPage.jsx corregidos correctamente.'
        );
    } else if (
        content.includes("from '../utils/orderRecipient.js'")
    ) {
        console.log(
            'Los imports ya están corregidos.'
        );
    } else {
        throw new Error(
            'No se encontró el import esperado. No se modificó el archivo.'
        );
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
