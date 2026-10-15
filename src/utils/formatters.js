import {
    formatDistanceToNow
} from 'date-fns';

import {
    es
} from 'date-fns/locale';

export function getEntityId(
    value
) {
    if (!value) {
        return '';
    }

    if (
        typeof value ===
        'string'
    ) {
        return value;
    }

    return (
        value._id ??
        value.id ??
        ''
    );
}

export function shortId(
    value
) {
    const id =
        getEntityId(
            value
        );

    if (!id) {
        return '—';
    }

    if (
        id.length <= 10
    ) {
        return id;
    }

    return `${id.slice(
        0,
        6
    )}…${id.slice(-4)}`;
}

export function formatNumber(
    value
) {
    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return '0';
    }

    return new Intl
        .NumberFormat(
            'es-AR'
        )
        .format(
            number
        );
}

export function formatMoney(
    value
) {
    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {
        return '—';
    }

    return `$ ${new Intl.NumberFormat(
        'es-AR',
        {
            minimumFractionDigits:
                0,
            maximumFractionDigits:
                2
        }
    ).format(number)}`;
}

export function formatDate(
    value
) {
    if (!value) {
        return '—';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '—';
    }

    return new Intl
        .DateTimeFormat(
            'es-AR',
            {
                day:
                    '2-digit',
                month:
                    'short',
                year:
                    'numeric'
            }
        )
        .format(date);
}

export function formatDateTime(
    value
) {
    if (!value) {
        return '—';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '—';
    }

    return new Intl
        .DateTimeFormat(
            'es-AR',
            {
                day:
                    '2-digit',
                month:
                    'short',
                year:
                    'numeric',
                hour:
                    '2-digit',
                minute:
                    '2-digit'
            }
        )
        .format(date);
}

export function relativeDate(
    value
) {
    if (!value) {
        return 'Sin fecha';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return 'Sin fecha';
    }

    return formatDistanceToNow(
        date,
        {
            addSuffix:
                true,
            locale:
                es
        }
    );
}

export function getPersonName(
    user
) {
    if (!user) {
        return 'Usuario';
    }

    const name =
        [
            user.firstName,
            user.lastName
        ]
            .filter(Boolean)
            .join(' ')
            .trim();

    return (
        name ||
        user.name ||
        user.email ||
        'Usuario'
    );
}

export function getInitials(
    user
) {
    if (!user) {
        return 'DO';
    }

    const first =
        user.firstName?.[0] ??
        user.name?.[0] ??
        user.email?.[0] ??
        'D';

    const second =
        user.lastName?.[0] ??
        '';

    return (
        `${first}${second}`
            .toUpperCase()
    );
}

export function roleLabel(
    role
) {
    const labels = {
        admin:
            'Administrador',

        customer:
            'Cliente',

        driver:
            'Repartidor',

        store:
            'Comercio'
    };

    return (
        labels[role] ??
        role ??
        'Usuario'
    );
}

export function statusLabel(
    status
) {
    const labels = {
        created:
            'Creado',

        pending:
            'Pendiente',

        assigned:
            'Asignado',

        picked_up:
            'Retirado',

        in_transit:
            'En tránsito',

        delivered:
            'Entregado',

        cancelled:
            'Cancelado',

        low:
            'Baja',

        normal:
            'Normal',

        high:
            'Alta'
    };

    return (
        labels[status] ??
        status ??
        'Sin estado'
    );
}