/**
 * Utilidades para ordenamiento y filtrado de partidos por prioridad
 */

/**
 * Ordena una lista de partidos por orden de prioridad:
 * 1. Partidos en vivo ('live') primero.
 * 2. Partidos próximos/programados ('scheduled' u otros pendientes), ordenados por cercanía (fecha y hora más próxima primero).
 * 3. Partidos finalizados ('finished'), ordenados por los jugados más recientemente primero.
 */
export const sortMatchesByPriority = (matchesList = []) => {
    if (!Array.isArray(matchesList)) return [];

    return [...matchesList].sort((a, b) => {
        // Prioridad por estado:
        // 0: En Vivo (máxima urgencia/prioridad)
        // 1: Programado / Pendiente (próximos a jugarse)
        // 2: Postergado
        // 3: Finalizado
        const getStatusWeight = (status) => {
            if (status === 'live') return 0;
            if (status === 'scheduled') return 1;
            if (status === 'postponed') return 2;
            if (status === 'finished') return 3;
            return 1;
        };

        const weightA = getStatusWeight(a.status);
        const weightB = getStatusWeight(b.status);

        if (weightA !== weightB) {
            return weightA - weightB;
        }

        // Si ambos están en el mismo estado:
        const hasDateA = Boolean(a.date);
        const hasDateB = Boolean(b.date);

        if (hasDateA && !hasDateB) return -1;
        if (!hasDateA && hasDateB) return 1;
        if (!hasDateA && !hasDateB) return 0;

        const dateTimeA = `${a.date}T${a.time ? a.time.padStart(5, '0') : '00:00'}`;
        const dateTimeB = `${b.date}T${b.time ? b.time.padStart(5, '0') : '00:00'}`;

        // Para partidos finalizados: mostrar los más recientes primero (descendente)
        if (a.status === 'finished' && b.status === 'finished') {
            return dateTimeB.localeCompare(dateTimeA);
        }

        // Para partidos próximos/programados/en vivo: entre más cercano a jugarse, primero (ascendente)
        return dateTimeA.localeCompare(dateTimeB);
    });
};
