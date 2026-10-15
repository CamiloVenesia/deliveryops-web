import {
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    Search,
    X
} from 'lucide-react';

import {
    useEffect
} from 'react';

import {
    statusLabel
} from '../utils/formatters.js';

export function Brand({
    inverse = false
}) {
    return (
        <div
            className={`brand ${
                inverse
                    ? 'brand--inverse'
                    : ''
            }`}
        >
            <span className="brand__mark">
                <span className="brand__parcel">
                    <i />
                    <i />
                </span>
            </span>

            <span className="brand__name">
                Delivery
                <strong>
                    Ops
                </strong>
            </span>
        </div>
    );
}

export function Button({
    children,
    variant =
        'primary',
    size =
        'md',
    loading =
        false,
    icon:
        Icon,
    className =
        '',
    disabled,
    ...props
}) {
    return (
        <button
            className={`button button--${variant} button--${size} ${className}`}
            disabled={
                disabled ||
                loading
            }
            {...props}
        >
            {loading ? (
                <LoaderCircle
                    className="spin"
                    size={
                        17
                    }
                />
            ) : (
                Icon && (
                    <Icon
                        size={
                            17
                        }
                    />
                )
            )}

            {children}
        </button>
    );
}

export function Card({
    children,
    className =
        ''
}) {
    return (
        <section
            className={`card ${className}`}
        >
            {children}
        </section>
    );
}

export function StatusBadge({
    status
}) {
    const classMap = {
        created:
            'neutral',

        pending:
            'warning',

        assigned:
            'info',

        picked_up:
            'info',

        in_transit:
            'brand',

        delivered:
            'success',

        cancelled:
            'danger',

        admin:
            'violet',

        customer:
            'info',

        driver:
            'success',

        store:
            'warning',

        low:
            'neutral',

        normal:
            'info',

        high:
            'danger'
    };

    const tone =
        classMap[status] ??
        'neutral';

    return (
        <span
            className={`badge badge--${tone}`}
        >
            {statusLabel(
                status
            )}
        </span>
    );
}

export function PageHeader({
    eyebrow,
    title,
    description,
    children
}) {
    return (
        <header className="page-header">
            <div>
                {eyebrow && (
                    <span className="page-header__eyebrow">
                        {eyebrow}
                    </span>
                )}

                <h1>
                    {title}
                </h1>

                {description && (
                    <p>
                        {
                            description
                        }
                    </p>
                )}
            </div>

            {children && (
                <div className="page-header__actions">
                    {children}
                </div>
            )}
        </header>
    );
}

export function SearchInput({
    value,
    onChange,
    placeholder =
        'Buscar...'
}) {
    return (
        <label className="search-input">
            <Search
                size={
                    17
                }
            />

            <input
                type="search"
                value={
                    value
                }
                onChange={
                    onChange
                }
                placeholder={
                    placeholder
                }
            />
        </label>
    );
}

export function LoadingState({
    title =
        'Cargando',
    description =
        'Estamos obteniendo la información.'
}) {
    return (
        <div className="loading-state">
            <span className="loading-state__icon">
                <LoaderCircle
                    className="spin"
                    size={
                        23
                    }
                />
            </span>

            <div>
                <strong>
                    {title}
                </strong>

                <span>
                    {
                        description
                    }
                </span>
            </div>
        </div>
    );
}

export function EmptyState({
    icon:
        Icon,
    title,
    description,
    children
}) {
    return (
        <div className="empty-state">
            {Icon && (
                <span className="empty-state__icon">
                    <Icon
                        size={
                            24
                        }
                    />
                </span>
            )}

            <h3>
                {title}
            </h3>

            <p>
                {description}
            </p>

            {children}
        </div>
    );
}

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size =
        'md'
}) {
    useEffect(
        () => {
            if (!open) {
                return undefined;
            }

            function handleKeyDown(
                event
            ) {
                if (
                    event.key ===
                    'Escape'
                ) {
                    onClose();
                }
            }

            document.addEventListener(
                'keydown',
                handleKeyDown
            );

            document.body
                .classList
                .add(
                    'modal-open'
                );

            return () => {
                document
                    .removeEventListener(
                        'keydown',
                        handleKeyDown
                    );

                document.body
                    .classList
                    .remove(
                        'modal-open'
                    );
            };
        },
        [
            open,
            onClose
        ]
    );

    if (!open) {
        return null;
    }

    return (
        <div
            className="modal-backdrop"
            onMouseDown={
                (event) => {
                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        onClose();
                    }
                }
            }
        >
            <section
                className={`modal modal--${size}`}
                role="dialog"
                aria-modal="true"
            >
                <header className="modal__header">
                    <div>
                        <h2>
                            {title}
                        </h2>

                        {description && (
                            <p>
                                {
                                    description
                                }
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="icon-button"
                        onClick={
                            onClose
                        }
                        aria-label="Cerrar"
                    >
                        <X
                            size={
                                19
                            }
                        />
                    </button>
                </header>

                <div className="modal__body">
                    {children}
                </div>

                {footer && (
                    <footer className="modal__footer">
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    );
}

export function Pagination({
    page,
    totalPages,
    total,
    onPageChange
}) {
    if (
        totalPages <= 1
    ) {
        return (
            <div className="pagination pagination--single">
                <span>
                    {total}{' '}
                    {total === 1
                        ? 'registro'
                        : 'registros'}
                </span>
            </div>
        );
    }

    return (
        <div className="pagination">
            <span className="pagination__summary">
                Página{' '}
                <strong>
                    {page}
                </strong>{' '}
                de{' '}
                <strong>
                    {totalPages}
                </strong>

                <i>
                    {total}{' '}
                    registros
                </i>
            </span>

            <div className="pagination__buttons">
                <button
                    type="button"
                    className="icon-button"
                    disabled={
                        page <= 1
                    }
                    onClick={() =>
                        onPageChange(
                            page - 1
                        )
                    }
                    aria-label="Página anterior"
                >
                    <ChevronLeft
                        size={
                            18
                        }
                    />
                </button>

                <button
                    type="button"
                    className="icon-button"
                    disabled={
                        page >=
                        totalPages
                    }
                    onClick={() =>
                        onPageChange(
                            page + 1
                        )
                    }
                    aria-label="Página siguiente"
                >
                    <ChevronRight
                        size={
                            18
                        }
                    />
                </button>
            </div>
        </div>
    );
}

export function MetricCard({
    label,
    value,
    description,
    icon:
        Icon,
    tone =
        'brand'
}) {
    return (
        <Card className="metric-card">
            <div className="metric-card__top">
                <span
                    className={`metric-card__icon metric-card__icon--${tone}`}
                >
                    <Icon
                        size={
                            19
                        }
                    />
                </span>
            </div>

            <strong className="metric-card__value">
                {value}
            </strong>

            <span className="metric-card__label">
                {label}
            </span>

            {description && (
                <span className="metric-card__description">
                    {description}
                </span>
            )}
        </Card>
    );
}