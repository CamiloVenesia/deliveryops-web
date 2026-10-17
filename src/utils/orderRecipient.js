
export const INITIAL_RECIPIENT = {
    fullName: '',
    phone: '',
    email: '',
    instructions: '',
    contactlessDelivery: false
};

export function buildRecipientLogistics(value) {
    const fullName = (value.fullName ?? '').trim();
    const phone = (value.phone ?? '').trim();
    const email = (value.email ?? '').trim();
    const instructions = (value.instructions ?? '').trim();

    return {
        recipient: {
            fullName,
            phone,
            ...(email ? { email } : {})
        },
        ...(instructions
            ? { deliveryInstructions: instructions }
            : {}),
        contactlessDelivery: Boolean(value.contactlessDelivery)
    };
}
