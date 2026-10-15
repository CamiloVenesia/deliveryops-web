import {
    ArrowLeft,
    MapPinOff
} from 'lucide-react';

import {
    useNavigate
} from 'react-router-dom';

import {
    Button,
    Card
} from '../components/ui.jsx';

export default function NotFoundPage() {
    const navigate =
        useNavigate();

    return (
        <Card className="not-found">
            <span className="not-found__icon">
                <MapPinOff
                    size={
                        30
                    }
                />
            </span>

            <span className="not-found__code">
                404
            </span>

            <h1>
                Esta página no existe
            </h1>

            <p>
                La ruta que intentaste abrir no forma parte de tu espacio de trabajo.
            </p>

            <Button
                icon={
                    ArrowLeft
                }
                onClick={() =>
                    navigate(
                        '/'
                    )
                }
            >
                Volver al dashboard
            </Button>
        </Card>
    );
}