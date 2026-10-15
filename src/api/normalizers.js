export function unwrapPayload(
    input
) {
    const data =
        input?.data ??
        input;

    if (
        !data ||
        typeof data !== 'object'
    ) {
        return data;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            'payload'
        )
    ) {
        return data.payload;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            'data'
        ) &&
        data.data !== undefined
    ) {
        return data.data;
    }

    return data;
}

export function extractAccessToken(
    input
) {
    const data =
        input?.data ??
        input;

    if (!data) {
        return null;
    }

    return (
        data.accessToken ??
        data.access_token ??
        data.token ??
        data.payload?.accessToken ??
        data.payload?.access_token ??
        data.payload?.token ??
        data.data?.accessToken ??
        data.data?.access_token ??
        data.data?.token ??
        null
    );
}

export function extractUser(
    input
) {
    const root =
        unwrapPayload(input);

    if (!root) {
        return null;
    }

    return (
        root.user ??
        root.currentUser ??
        root.profile ??
        root
    );
}

export function extractEntity(
    input,
    names = []
) {
    const root =
        unwrapPayload(input);

    if (!root) {
        return null;
    }

    for (
        const name
        of names
    ) {
        if (root[name]) {
            return root[name];
        }
    }

    return root;
}

export function normalizeCollection(
    input
) {
    const root =
        unwrapPayload(input) ??
        {};

    if (
        Array.isArray(root)
    ) {
        return {
            items: root,
            page: 1,
            limit: root.length,
            total: root.length,
            totalPages: 1
        };
    }

    const pagination =
        root.pagination ??
        root.meta ??
        {};

    const items =
        root.items ??
        root.docs ??
        root.results ??
        root.users ??
        root.orders ??
        root.deliveries ??
        [];

    const safeItems =
        Array.isArray(items)
            ? items
            : [];

    const page =
        Number(
            root.page ??
            pagination.page ??
            1
        );

    const limit =
        Number(
            root.limit ??
            pagination.limit ??
            safeItems.length ??
            10
        );

    const total =
        Number(
            root.total ??
            pagination.total ??
            safeItems.length
        );

    const totalPages =
        Number(
            root.totalPages ??
            pagination.totalPages ??
            Math.max(
                1,
                Math.ceil(
                    total /
                    Math.max(
                        limit,
                        1
                    )
                )
            )
        );

    return {
        items: safeItems,
        page,
        limit,
        total,
        totalPages
    };
}

export function getApiErrorMessage(
    error,
    fallback =
        'Ocurrió un error inesperado.'
) {
    return (
        error?.response?.data
            ?.message ??
        error?.response?.data
            ?.error?.message ??
        error?.message ??
        fallback
    );
}