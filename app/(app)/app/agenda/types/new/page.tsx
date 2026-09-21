import { NewTypeClient } from "./new-type-client";

/**
 * /app/agenda/types/new — formulário para criar um novo tipo de agendamento.
 *
 * Server component simples (apenas renderiza o client form).
 * O POST vai para /api/me/appointment-types (com CSRF + auth).
 */
export default function NewAppointmentTypePage() {
  return <NewTypeClient />;
}
