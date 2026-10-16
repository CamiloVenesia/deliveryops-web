import {
    ArrowRight,
    Clock3,
    History,
    UserRound,
    Workflow
} from 'lucide-react';

import {
    StatusBadge
} from './ui.jsx';

import {
    formatDateTime,
    roleLabel,
    shortId,
    statusLabel
} from '../utils/formatters.js';

import '../styles/operations.css';

const EMPTY_ARRAY = [];

function sourceLabel(
    source
) {
    const labels = {
        order:
            'Pedido',

        delivery:
            'Entrega',

        system:
            'Sistema'
    };

    return (
        labels[source] ??
        source ??
        'Sistema'
    );
}

export default function OperationTimeline({
    history = EMPTY_ARRAY,
    currentStatus,
    title =
        'Historial operativo'
}) {
    const orderedHistory =
        [...history].sort(
            (
                first,
                second
            ) => {
                const firstDate =
                    new Date(
                        first.changedAt ??
                            0
                    ).getTime();

                const secondDate =
                    new Date(
                        second.changedAt ??
                            0
                    ).getTime();

                return (
                    firstDate -
                    secondDate
                );
            }
        );

    return (
        <section className="operation-timeline">
            <div className="operation-timeline__header">
                <div>
                    <span className="operation-timeline__eyebrow">
                        <History
                            size={
                                14
                            }
                        />

                        Trazabilidad
                    </span>

                    <h3>
                        {title}
                    </h3>

                    <p>
                        Registro cronológico de los cambios de estado.
                    </p>
                </div>

                {currentStatus && (
                    <div className="operation-timeline__current">
                        <span>
                            Estado actual
                        </span>

                        <StatusBadge
                            status={
                                currentStatus
                            }
                        />
                    </div>
                )}
            </div>

            {orderedHistory.length ===
            0 ? (
                <div className="operation-timeline__empty">
                    <span className="operation-timeline__empty-icon">
                        <History
                            size={
                                20
                            }
                        />
                    </span>

                    <div>
                        <strong>
                            Sin historial registrado
                        </strong>

                        <span>
                            Este registro todavía no posee movimientos guardados en su historial operativo.
                        </span>
                    </div>
                </div>
            ) : (
                <div className="operation-timeline__list">
                    {orderedHistory.map(
                        (
                            item,
                            index
                        ) => {
                            const isLast =
                                index ===
                                orderedHistory.length -
                                    1;

                            return (
                                <article
                                    className={`operation-timeline__item ${
                                        isLast
                                            ? 'operation-timeline__item--last'
                                            : ''
                                    }`}
                                    key={`${item.changedAt ?? 'history'}-${item.from ?? 'start'}-${item.to ?? index}-${index}`}
                                >
                                    <div className="operation-timeline__rail">
                                        <span className="operation-timeline__dot" />

                                        {!isLast && (
                                            <span className="operation-timeline__line" />
                                        )}
                                    </div>

                                    <div className="operation-timeline__content">
                                        <div className="operation-timeline__top">
                                            <div className="operation-timeline__transition">
                                                {item.from ? (
                                                    <>
                                                        <span>
                                                            {statusLabel(
                                                                item.from
                                                            )}
                                                        </span>

                                                        <ArrowRight
                                                            size={
                                                                14
                                                            }
                                                        />
                                                    </>
                                                ) : (
                                                    <span>
                                                        Inicio
                                                    </span>
                                                )}

                                                <StatusBadge
                                                    status={
                                                        item.to
                                                    }
                                                />
                                            </div>

                                            <span className="operation-timeline__date">
                                                <Clock3
                                                    size={
                                                        13
                                                    }
                                                />

                                                {formatDateTime(
                                                    item.changedAt
                                                )}
                                            </span>
                                        </div>

                                        <div className="operation-timeline__meta">
                                            <span>
                                                <UserRound
                                                    size={
                                                        13
                                                    }
                                                />

                                                {roleLabel(
                                                    item.changedByRole
                                                )}

                                                {item.changedBy && (
                                                    <>
                                                        {' '}
                                                        · #
                                                        {shortId(
                                                            item.changedBy
                                                        )}
                                                    </>
                                                )}
                                            </span>

                                            <span>
                                                <Workflow
                                                    size={
                                                        13
                                                    }
                                                />

                                                Origen:{' '}
                                                {sourceLabel(
                                                    item.source
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            );
                        }
                    )}
                </div>
            )}
        </section>
    );
}