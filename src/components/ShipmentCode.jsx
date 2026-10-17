
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { shortId } from '../utils/formatters.js';
import '../styles/shipment-polish.css';

export default function ShipmentCode({ record, label = 'Envío' }) {
    const [copied, setCopied] = useState(false);

    const trackingCode = record?.trackingCode;
    const displayCode = trackingCode || `#${shortId(record)}`;

    async function copyCode(event) {
        event.stopPropagation();

        if (!navigator.clipboard?.writeText) return;

        try {
            await navigator.clipboard.writeText(displayCode);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <span className="shipment-code">
            <span className="shipment-code__text" title={displayCode}>
                {displayCode}
            </span>

            {trackingCode && (
                <button
                    type="button"
                    className="shipment-code__copy"
                    title={copied ? 'Código copiado' : 'Copiar código'}
                    aria-label={`Copiar código de ${label.toLowerCase()}`}
                    onClick={copyCode}
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            )}
        </span>
    );
}
