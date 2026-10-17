
import {
    UserRound,
    Phone,
    Mail,
    MessageSquareText
} from 'lucide-react';

import '../styles/shipment-polish.css';

function RecipientField({
    icon: Icon,
    label,
    value,
    onChange,
    required = false,
    type = 'text',
    placeholder,
    maxLength = 180
}) {
    return (
        <label className="recipient-field">
            <span className="recipient-field__label">
                <Icon size={14} />
                {label}
                {required && <b> *</b>}
            </span>

            <input
                className="recipient-field__input"
                type={type}
                required={required}
                minLength={required ? 3 : undefined}
                maxLength={maxLength}
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
            />
        </label>
    );
}

export default function OrderRecipientFields({ value, onChange }) {
    function update(field, fieldValue) {
        onChange(current => ({
            ...current,
            [field]: fieldValue
        }));
    }

    return (
        <section className="recipient-section">
            <div className="recipient-section__heading">
                <span className="recipient-section__icon">
                    <UserRound size={19} />
                </span>

                <div>
                    <h3>¿Quién recibe el paquete?</h3>
                    <p>
                        El destinatario puede ser diferente del cliente
                        que contrata el envío.
                    </p>
                </div>
            </div>

            <div className="recipient-fields">
                <RecipientField
                    icon={UserRound}
                    label="Nombre completo del destinatario"
                    required
                    value={value.fullName}
                    onChange={next => update('fullName', next)}
                    placeholder="Ej. María Fernández"
                />

                <RecipientField
                    icon={Phone}
                    label="Teléfono de contacto"
                    required
                    type="tel"
                    maxLength={40}
                    value={value.phone}
                    onChange={next => update('phone', next)}
                    placeholder="Ej. 3415551234"
                />

                <RecipientField
                    icon={Mail}
                    label="Email (opcional)"
                    type="email"
                    value={value.email}
                    onChange={next => update('email', next)}
                    placeholder="destinatario@ejemplo.com"
                />

                <label className="recipient-field recipient-field--full">
                    <span className="recipient-field__label">
                        <MessageSquareText size={14} />
                        Instrucciones para entregar
                    </span>

                    <textarea
                        className="recipient-field__input"
                        rows={3}
                        maxLength={1000}
                        value={value.instructions}
                        onChange={event =>
                            update('instructions', event.target.value)
                        }
                        placeholder="Ej. Llamar al llegar, portería, horario de recepción..."
                    />
                </label>
            </div>

            <label className="recipient-contactless">
                <input
                    type="checkbox"
                    checked={value.contactlessDelivery}
                    onChange={event =>
                        update('contactlessDelivery', event.target.checked)
                    }
                />

                <span>
                    <strong>Entrega sin contacto</strong>
                    <small>
                        El destinatario solicita evitar el contacto directo.
                    </small>
                </span>
            </label>
        </section>
    );
}
