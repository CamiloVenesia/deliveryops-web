
import { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Package,
    Save,
    ShieldCheck
} from 'lucide-react';

import './driver-capacity.css';

const DEFAULT_CAPACITY = 12;

function safeCapacity(value) {
    const capacity = Number(value);

    return Number.isInteger(capacity) &&
        capacity >= 1 &&
        capacity <= 50
        ? capacity
        : DEFAULT_CAPACITY;
}

function CapacityContent({
    driver,
    capacity,
    editable,
    pending,
    onSave
}) {
    const [draft, setDraft] = useState(String(capacity));

    const active = Math.max(
        0,
        Number(driver?.metrics?.activeDeliveries) || 0
    );

    const available = Math.max(
        0,
        capacity - active
    );

    const percentage = Math.min(
        100,
        active / capacity * 100
    );

    const overloaded = active > capacity;
    const full = active >= capacity;

    const parsed = Number(draft);

    const valid =
        /^\d+$/.test(draft) &&
        Number.isInteger(parsed) &&
        parsed >= 1 &&
        parsed <= 50;

    const changed =
        valid &&
        parsed !== capacity;

    function submit(event) {
        event.preventDefault();

        if (!editable || pending || !changed) {
            return;
        }

        onSave?.(driver.id, parsed);
    }

    return (
        <section
            className="driver-capacity"
            aria-label="Capacidad de reparto"
        >
            <div className="driver-capacity__heading">
                <div>
                    <span className="driver-capacity__eyebrow">
                        CAPACIDAD OPERATIVA
                    </span>

                    <h3>
                        <Package size={17} />
                        Carga de trabajo
                    </h3>

                    <p>
                        Entregas activas frente a la capacidad
                        configurada.
                    </p>
                </div>

                <span
                    className={`driver-capacity__state ${
                        full ? 'is-full' : 'has-room'
                    }`}
                >
                    {full
                        ? 'Sin cupos libres'
                        : `${available} cupo${available === 1 ? '' : 's'} libre${available === 1 ? '' : 's'}`}
                </span>
            </div>

            <div className="driver-capacity__visual">
                <div className="driver-capacity__numbers">
                    <div>
                        <strong>{active}</strong>
                        <span> / {capacity} entregas</span>
                    </div>

                    <span>
                        {Math.round(percentage)}% ocupado
                    </span>
                </div>

                <div
                    className="driver-capacity__track"
                    role="progressbar"
                    aria-label="Ocupación de entregas"
                    aria-valuemin={0}
                    aria-valuemax={capacity}
                    aria-valuenow={Math.min(active, capacity)}
                    aria-valuetext={`${active} de ${capacity} entregas asignadas`}
                >
                    <span
                        className={
                            full
                                ? 'driver-capacity__fill is-full'
                                : 'driver-capacity__fill'
                        }
                        style={{
                            width: `${percentage}%`
                        }}
                    />
                </div>

                <div className="driver-capacity__legend">
                    <span>
                        <span className="driver-capacity__dot" />
                        {active} activas
                    </span>

                    <span>
                        <span className="driver-capacity__dot driver-capacity__dot--free" />
                        {available} disponibles
                    </span>
                </div>
            </div>

            {overloaded && (
                <div
                    className="driver-capacity__warning"
                    role="status"
                >
                    <AlertTriangle size={17} />

                    <span>
                        Hay {active - capacity} entregas por
                        encima del nuevo límite. Las entregas
                        existentes se conservan, pero no se
                        permitirán nuevas asignaciones hasta
                        liberar cupos.
                    </span>
                </div>
            )}

            {editable ? (
                <form
                    className="driver-capacity__form"
                    onSubmit={submit}
                >
                    <label htmlFor={`capacity-${driver.id}`}>
                        Capacidad máxima
                    </label>

                    <div className="driver-capacity__controls">
                        <input
                            id={`capacity-${driver.id}`}
                            type="number"
                            min="1"
                            max="50"
                            step="1"
                            inputMode="numeric"
                            value={draft}
                            disabled={pending}
                            onChange={event =>
                                setDraft(event.target.value)
                            }
                            aria-invalid={!valid}
                            aria-describedby={
                                `capacity-help-${driver.id}`
                            }
                        />

                        <button
                            type="submit"
                            disabled={
                                pending ||
                                !valid ||
                                !changed
                            }
                        >
                            <Save size={15} />
                            {pending
                                ? 'Guardando...'
                                : 'Guardar capacidad'}
                        </button>
                    </div>

                    <p id={`capacity-help-${driver.id}`}>
                        Valor permitido: 1 a 50 entregas.
                        El cambio no cancela operaciones existentes.
                    </p>

                    {!valid && (
                        <span
                            className="driver-capacity__validation"
                            role="alert"
                        >
                            Ingresá un número entero entre 1 y 50.
                        </span>
                    )}
                </form>
            ) : (
                <div className="driver-capacity__readonly">
                    <ShieldCheck size={16} />
                    La capacidad máxima es configurada
                    por el administrador.
                </div>
            )}

            <div className="driver-capacity__footnote">
                <CheckCircle2 size={15} />

                <span>
                    Tener entregas activas no significa estar
                    ocupado. Podés recibir nuevas asignaciones
                    si estás disponible y todavía tenés cupos.
                </span>
            </div>
        </section>
    );
}

export default function DriverCapacityEditor({
    driver,
    editable = false,
    pending = false,
    onSave
}) {
    const capacity = safeCapacity(
        driver?.maxConcurrentDeliveries
    );

    return (
        <CapacityContent
            key={`${driver?.id ?? 'unknown'}-${capacity}`}
            driver={driver}
            capacity={capacity}
            editable={editable}
            pending={pending}
            onSave={onSave}
        />
    );
}
