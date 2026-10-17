
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Camera,
    CheckCircle2,
    FileCheck2,
    PenLine,
    RotateCcw,
    TriangleAlert,
    UploadCloud
} from 'lucide-react';

import { deliveryService } from '../api/services.js';
import { deliveryLogisticsService } from '../api/logistics.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useToast } from './useToast.js';
import { Button, Card } from './ui.jsx';

import './delivery-proof.css';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function SignaturePad({ canvasRef, onSigned, disabled }) {
    const strokesRef = useRef([]);
    const drawingRef = useRef(false);

    function point(event) {
        const canvas = canvasRef.current;
        const bounds = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - bounds.left) *
                canvas.width / bounds.width,
            y: (event.clientY - bounds.top) *
                canvas.height / bounds.height
        };
    }

    function paint() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#152238';
        ctx.fillStyle = '#152238';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const stroke of strokesRef.current) {
            if (stroke.length === 1) {
                ctx.beginPath();
                ctx.arc(
                    stroke[0].x,
                    stroke[0].y,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                continue;
            }

            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);

            for (const current of stroke.slice(1)) {
                ctx.lineTo(current.x, current.y);
            }

            ctx.stroke();
        }
    }

    function start(event) {
        if (
            disabled ||
            (event.pointerType === 'mouse' && event.button !== 0)
        ) {
            return;
        }

        event.preventDefault();

        event.currentTarget.setPointerCapture(event.pointerId);
        strokesRef.current.push([point(event)]);
        drawingRef.current = true;

        paint();
        onSigned(true);
    }

    function move(event) {
        if (!drawingRef.current || disabled) return;

        event.preventDefault();

        strokesRef.current.at(-1)?.push(point(event));
        paint();
    }

    function finish() {
        drawingRef.current = false;
    }

    function clear() {
        if (disabled) return;

        strokesRef.current = [];
        drawingRef.current = false;

        paint();
        onSigned(false);
    }

    return (
        <div className="proof-signature">
            <div className="proof-signature__header">
                <span>
                    <PenLine size={16} />
                    Firma de quien recibe *
                </span>

                <button
                    type="button"
                    onClick={clear}
                    disabled={disabled}
                >
                    <RotateCcw size={14} />
                    Borrar
                </button>
            </div>

            <canvas
                ref={canvasRef}
                width={960}
                height={240}
                className="proof-signature__canvas"
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={finish}
                onLostPointerCapture={finish}
                aria-label="Área para dibujar la firma de recepción"
            />

            <p>
                Firmá usando el dedo, un lápiz táctil o el mouse.
            </p>
        </div>
    );
}

function loadPhoto(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(
                new Error('No se pudo leer la fotografía.')
            );
        };

        image.src = url;
    });
}

function encodeJpeg(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(
                        new Error('No se pudo generar el comprobante.')
                    );
                }
            },
            'image/jpeg',
            quality
        );
    });
}

async function createReceipt({
    photo,
    signatureCanvas,
    receivedBy,
    relationship,
    trackingCode
}) {
    const image = await loadPhoto(photo);

    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 1480;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error(
            'Este navegador no puede crear el comprobante.'
        );
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1100, 1480);

    ctx.fillStyle = '#10233f';
    ctx.fillRect(0, 0, 1100, 112);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 37px Arial';
    ctx.fillText('DeliveryOps', 52, 73);

    ctx.font = '20px Arial';
    ctx.fillText('Comprobante de entrega', 780, 71);

    ctx.fillStyle = '#64748b';
    ctx.font = '22px Arial';
    ctx.fillText(
        `Entrega: ${trackingCode || 'Sin código'}`,
        52,
        158
    );

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(52, 188, 996, 875);

    const ratio = Math.min(
        996 / image.width,
        875 / image.height
    );

    const width = image.width * ratio;
    const height = image.height * ratio;

    ctx.drawImage(
        image,
        52 + (996 - width) / 2,
        188 + (875 - height) / 2,
        width,
        height
    );

    ctx.fillStyle = '#10233f';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('RECIBIDO POR', 52, 1110);

    ctx.font = '27px Arial';
    ctx.fillText(
        receivedBy.slice(0, 65),
        52,
        1150
    );

    if (relationship) {
        ctx.font = '19px Arial';
        ctx.fillText(
            relationship.slice(0, 90),
            52,
            1182
        );
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(52, 1205, 996, 190);

    ctx.drawImage(
        signatureCanvas,
        66,
        1211,
        960,
        180
    );

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(52, 1403);
    ctx.lineTo(1048, 1403);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '18px Arial';
    ctx.fillText(
        `Registro: ${new Date().toLocaleString('es-AR')}`,
        52,
        1440
    );

    let blob = await encodeJpeg(canvas, 0.82);

    if (blob.size > MAX_RECEIPT_BYTES) {
        blob = await encodeJpeg(canvas, 0.55);
    }

    if (blob.size > MAX_RECEIPT_BYTES) {
        throw new Error(
            'El comprobante supera 5 MB. Elegí otra fotografía.'
        );
    }

    return new File(
        [blob],
        `deliveryops-comprobante-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
    );
}

export default function DeliveryProofCapture({
    deliveryId,
    status,
    trackingCode,
    proof,
    onRefresh
}) {
    const { pushToast } = useToast();
    const queryClient = useQueryClient();

    const signatureRef = useRef(null);

    const [receivedBy, setReceivedBy] = useState('');
    const [relationship, setRelationship] = useState('Destinatario');
    const [notes, setNotes] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [signed, setSigned] = useState(false);
    const [saving, setSaving] = useState(false);

    const [receiptUploaded, setReceiptUploaded] = useState(false);
    const [proofSaved, setProofSaved] = useState(false);

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const completed = status === 'delivered';

    const hasProof =
        Boolean(proof?.receivedAt) || proofSaved;

    const canRegister =
        status === 'in_transit' && !hasProof;

    const canFinalize =
        status === 'in_transit' && hasProof;

    function invalidateOperations() {
        onRefresh?.();

        queryClient.invalidateQueries({
            queryKey: ['analytics']
        });

        queryClient.invalidateQueries({
            queryKey: ['dashboard']
        });

        queryClient.invalidateQueries({
            queryKey: ['orders']
        });

        queryClient.invalidateQueries({
            queryKey: ['deliveries']
        });

        queryClient.invalidateQueries({
            queryKey: ['tracking', deliveryId]
        });
    }

    function choosePhoto(file) {
        setPhoto(null);
        setPhotoPreview('');
        setReceiptUploaded(false);

        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            pushToast({
                type: 'error',
                title: 'Formato incorrecto',
                message: 'Seleccioná JPG o PNG.'
            });
            return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
            pushToast({
                type: 'error',
                title: 'Fotografía demasiado grande',
                message: 'Máximo: 10 MB.'
            });
            return;
        }

        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    }

    async function finishDelivery() {
        if (!canFinalize || saving) return;

        setSaving(true);

        try {
            await deliveryService.updateStatus(
                deliveryId,
                'delivered'
            );

            pushToast({
                title: 'Entrega finalizada',
                message:
                    'La entrega y su pedido quedaron marcados como entregados.'
            });

            invalidateOperations();
        } catch (error) {
            pushToast({
                type: 'error',
                title: 'No se pudo finalizar la entrega',
                message: getApiErrorMessage(
                    error,
                    'El comprobante está guardado. Podés reintentar el cierre.'
                )
            });

            invalidateOperations();
        } finally {
            setSaving(false);
        }
    }

    async function submit(event) {
        event.preventDefault();

        if (!canRegister || saving) return;

        if (!receivedBy.trim() || !photo || !signed) {
            pushToast({
                type: 'error',
                title: 'Faltan datos',
                message: 'Ingresá receptor, foto y firma.'
            });
            return;
        }

        setSaving(true);

        let phase = 'upload';

        try {
            if (!receiptUploaded) {
                const file = await createReceipt({
                    photo,
                    signatureCanvas: signatureRef.current,
                    receivedBy: receivedBy.trim(),
                    relationship: relationship.trim(),
                    trackingCode
                });

                await deliveryService.uploadReceipt(
                    deliveryId,
                    file
                );

                setReceiptUploaded(true);
            }

            phase = 'proof';

            await deliveryLogisticsService.recordProof(
                deliveryId,
                {
                    receivedBy: receivedBy.trim(),
                    ...(relationship.trim()
                        ? { relationship: relationship.trim() }
                        : {}),
                    ...(notes.trim()
                        ? { notes: notes.trim() }
                        : {})
                }
            );

            setProofSaved(true);
            phase = 'status';

            await deliveryService.updateStatus(
                deliveryId,
                'delivered'
            );

            pushToast({
                title: 'Entrega finalizada',
                message:
                    'Comprobante, firma y estado de entrega guardados.'
            });

            invalidateOperations();
        } catch (error) {
            invalidateOperations();

            const statusFailed = phase === 'status';

            pushToast({
                type: 'error',
                title: statusFailed
                    ? 'Comprobante guardado; entrega aún en tránsito'
                    : 'No se pudo registrar la recepción',
                message: statusFailed
                    ? `${getApiErrorMessage(error)} Usá «Finalizar entrega» para reintentar sin subir la foto otra vez.`
                    : getApiErrorMessage(error)
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card className="tracking-card tracking-card--wide">
            <div className="proof-heading">
                <span className="proof-heading__icon">
                    <FileCheck2 size={20} />
                </span>

                <div>
                    <h2>Confirmación de recepción</h2>
                    <p>
                        Fotografía, firma y cierre del estado de entrega.
                    </p>
                </div>
            </div>

            {completed ? (
                <div className="proof-completed">
                    <CheckCircle2 size={24} />

                    <div>
                        <strong>Entrega finalizada</strong>

                        <p>
                            Estado: Entregado.
                            {' '}
                            {proof?.receivedBy
                                ? `Recibido por ${proof.receivedBy}.`
                                : ''}
                        </p>
                    </div>
                </div>
            ) : canFinalize ? (
                <div className="proof-editor">
                    <div className="proof-notice" role="status">
                        <TriangleAlert size={18} />

                        <strong>
                            Comprobante registrado, pero la entrega
                            sigue en tránsito.
                        </strong>

                        <p>
                            La foto y la firma no necesitan volver a
                            cargarse. Confirmá el cierre para actualizar
                            también el pedido y el dashboard.
                        </p>
                    </div>

                    <Button
                        type="button"
                        icon={CheckCircle2}
                        loading={saving}
                        onClick={finishDelivery}
                    >
                        Finalizar entrega
                    </Button>
                </div>
            ) : !canRegister ? (
                <p className="proof-notice">
                    La entrega debe estar en tránsito para registrar
                    su recepción.
                </p>
            ) : (
                <form
                    className="proof-editor"
                    onSubmit={submit}
                >
                    <div className="proof-editor__fields">
                        <label>
                            Nombre de quien recibe *

                            <input
                                required
                                minLength={2}
                                maxLength={180}
                                value={receivedBy}
                                onChange={event =>
                                    setReceivedBy(event.target.value)
                                }
                                placeholder="Nombre y apellido"
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Relación con el destinatario

                            <select
                                value={relationship}
                                onChange={event =>
                                    setRelationship(event.target.value)
                                }
                                disabled={saving}
                            >
                                <option value="Destinatario">
                                    Destinatario
                                </option>
                                <option value="Familiar">
                                    Familiar
                                </option>
                                <option value="Recepción">
                                    Recepción
                                </option>
                                <option value="Encargado">
                                    Encargado
                                </option>
                                <option value="Otra persona">
                                    Otra persona
                                </option>
                            </select>
                        </label>
                    </div>

                    <div className="proof-photo">
                        <div className="proof-photo__title">
                            <Camera size={18} />
                            <strong>Fotografía de recepción *</strong>
                        </div>

                        {photoPreview ? (
                            <img
                                src={photoPreview}
                                alt="Vista previa del comprobante"
                                className="proof-photo__preview"
                            />
                        ) : (
                            <div className="proof-photo__empty">
                                <Camera size={30} />
                                <span>
                                    Fotografiá el paquete o la recepción
                                </span>
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/jpeg,image/png"
                            capture="environment"
                            onChange={event =>
                                choosePhoto(event.target.files?.[0])
                            }
                            disabled={saving}
                        />

                        <p>
                            La foto y la firma se guardarán juntas
                            en un único JPG.
                        </p>
                    </div>

                    <SignaturePad
                        canvasRef={signatureRef}
                        onSigned={setSigned}
                        disabled={saving}
                    />

                    <label className="proof-editor__notes">
                        Observaciones (opcional)

                        <textarea
                            rows={3}
                            maxLength={1000}
                            value={notes}
                            onChange={event =>
                                setNotes(event.target.value)
                            }
                            placeholder="Estado del paquete u observaciones de recepción..."
                            disabled={saving}
                        />
                    </label>

                    <div className="proof-editor__footer">
                        <p>
                            <UploadCloud size={15} />
                            Al registrar, la entrega pasará a Entregado.
                        </p>

                        <Button
                            type="submit"
                            icon={CheckCircle2}
                            loading={saving}
                            disabled={
                                saving ||
                                !receivedBy.trim() ||
                                !photo ||
                                !signed
                            }
                        >
                            Confirmar entrega
                        </Button>
                    </div>
                </form>
            )}
        </Card>
    );
}
