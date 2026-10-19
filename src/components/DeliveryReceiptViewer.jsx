
import { useEffect, useRef, useState } from 'react';
import {
    Download,
    Eye,
    FileImage,
    FileWarning,
    LockKeyhole,
    X
} from 'lucide-react';

import { receiptService } from '../api/receipt.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { Button, Modal } from './ui.jsx';

import './delivery-receipt-viewer.css';

const CONTENT_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf'
};

async function explainError(error) {
    if (error?.response?.status === 410) {
        return 'Este archivo se cargó antes del almacenamiento permanente. Si Render ya lo eliminó, no podrá recuperarse.';
    }

    if (error?.response?.status === 404) {
        return 'No hay un archivo adjunto disponible para esta entrega.';
    }

    if (error?.response?.status === 403) {
        return 'Tu usuario no tiene permiso para consultar este comprobante.';
    }

    if (error?.response?.status === 401) {
        return 'Tu sesión expiró. Volvé a iniciar sesión.';
    }

    const payload = error?.response?.data;

    if (payload instanceof Blob && payload.type.includes('json')) {
        try {
            const json = JSON.parse(await payload.text());

            if (typeof json.message === 'string') {
                return json.message;
            }
        } catch {
            // Mostramos el error genérico de conexión.
        }
    }

    return getApiErrorMessage(
        error,
        'No se pudo consultar el comprobante. Intentá nuevamente.'
    );
}

export default function DeliveryReceiptViewer({
    deliveryId,
    trackingCode,
    receipt,
    confirmed
}) {
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState('');

    const previewUrlRef = useRef(null);
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;

        return () => {
            aliveRef.current = false;

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
        };
    }, []);

    function closePreview() {
        setPreview(null);

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    }

    async function fetchReceipt(download) {
        if (!deliveryId || busy) return;

        setBusy(download ? 'download' : 'view');
        setMessage('');

        try {
            const result = await receiptService.get(
                deliveryId,
                { download }
            );

            if (!aliveRef.current) return;

            const contentType = result.contentType
                .split(';')[0]
                .trim();

            const extension = CONTENT_EXTENSIONS[contentType];

            if (!extension) {
                throw new Error(
                    'Formato de archivo no admitido para la vista previa.'
                );
            }

            const url = URL.createObjectURL(result.blob);

            if (download) {
                const anchor = document.createElement('a');

                anchor.href = url;
                anchor.download =
                    `comprobante-${trackingCode || deliveryId}.${extension}`;

                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();

                window.setTimeout(
                    () => URL.revokeObjectURL(url),
                    1000
                );
            } else {
                closePreview();
                previewUrlRef.current = url;

                setPreview({
                    url,
                    contentType
                });
            }
        } catch (error) {
            if (aliveRef.current) {
                const text = await explainError(error);

                if (aliveRef.current) {
                    setMessage(text);
                }
            }
        } finally {
            if (aliveRef.current) {
                setBusy('');
            }
        }
    }

    const hasFile = Boolean(
        receipt?.path || receipt?.uploadedAt
    );

    return (
        <div className="receipt-viewer">
            <div className="receipt-viewer__heading">
                <FileImage size={17} />
                <strong>Archivo de evidencia</strong>
            </div>

            {hasFile ? (
                <>
                    <div className="receipt-viewer__actions">
                        <Button
                            type="button"
                            variant="secondary"
                            icon={Eye}
                            loading={busy === 'view'}
                            disabled={Boolean(busy)}
                            onClick={() => fetchReceipt(false)}
                        >
                            Ver comprobante
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            icon={Download}
                            loading={busy === 'download'}
                            disabled={Boolean(busy)}
                            onClick={() => fetchReceipt(true)}
                        >
                            Descargar
                        </Button>
                    </div>

                    <p className="receipt-viewer__hint">
                        <LockKeyhole size={13} />
                        Acceso protegido según el rol y la entrega asignada.
                    </p>
                </>
            ) : (
                <p className="receipt-viewer__muted">
                    {confirmed
                        ? 'La recepción está confirmada, pero no hay fotografía o firma adjunta.'
                        : 'Todavía no se adjuntó evidencia digital.'}
                </p>
            )}

            {message && (
                <div
                    className="receipt-viewer__error"
                    role="alert"
                >
                    <FileWarning size={16} />
                    <span>{message}</span>
                </div>
            )}

            <Modal
                open={Boolean(preview)}
                onClose={closePreview}
                title={`Comprobante ${trackingCode || ''}`}
                description="Vista privada del archivo adjunto a esta entrega."
                size="lg"
            >
                {preview && (
                    <div className="receipt-viewer__preview">
                        <div className="receipt-viewer__preview-toolbar">
                            <span>Documento de recepción</span>

                            <button
                                type="button"
                                aria-label="Cerrar vista previa"
                                onClick={closePreview}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {preview.contentType === 'application/pdf' ? (
                            <iframe
                                title="Comprobante de entrega PDF"
                                src={preview.url}
                            />
                        ) : (
                            <img
                                src={preview.url}
                                alt="Fotografía y firma del comprobante"
                            />
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
