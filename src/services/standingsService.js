/**
 * Servicio de Cálculo de Clasificación y Puntos Oficiales de la LVC
 * 
 * Regla de Distribución de Puntos LVC:
 * Resultado    Ganador    Perdedor
 * 3 - 0           5          0
 * 3 - 1           4          1
 * 3 - 2           3          2
 */

/**
 * Calcula los puntos de clasificación de la LVC según el resultado en sets
 * @param {number} setsA - Sets ganados por Equipo A
 * @param {number} setsB - Sets ganados por Equipo B
 * @returns {{ pointsA: number, pointsB: number }}
 */
export const getLvcMatchPoints = (setsA, setsB) => {
    const sA = Number(setsA) || 0;
    const sB = Number(setsB) || 0;

    if (sA === sB) {
        return { pointsA: 0, pointsB: 0 };
    }

    if (sA > sB) {
        if (sB === 0) return { pointsA: 5, pointsB: 0 }; // 3 - 0
        if (sB === 1) return { pointsA: 4, pointsB: 1 }; // 3 - 1
        if (sB === 2) return { pointsA: 3, pointsB: 2 }; // 3 - 2
        return { pointsA: 5, pointsB: 0 };
    } else {
        if (sA === 0) return { pointsA: 0, pointsB: 5 }; // 0 - 3
        if (sA === 1) return { pointsA: 1, pointsB: 4 }; // 1 - 3
        if (sA === 2) return { pointsA: 2, pointsB: 3 }; // 2 - 3
        return { pointsA: 0, pointsB: 5 };
    }
};

/**
 * Calcula la tabla de posiciones acumulada a partir de los partidos finalizados
 * @param {Array} matches - Lista de partidos
 * @param {Array} teams - Lista de equipos
 * @returns {Array} Tabla de posiciones ordenada
 */
export const calculateStandings = (matches, teams) => {
    const standings = teams.reduce((acc, team) => {
        acc[team.id] = {
            teamId: team.id,
            teamName: team.name,
            logoUrl: team.logo_url || team.logoUrl,
            category: team.category,
            pj: 0, pg: 0, pp: 0,
            setsFavor: 0, setsAgainst: 0,
            points: 0
        };
        return acc;
    }, {});

    matches.filter(m => m.status === 'finished').forEach(match => {
        const teamAId = match.team_a_id || match.teamAId;
        const teamBId = match.team_b_id || match.teamBId;
        const score = match.score || {};
        const setsA = Number(score?.setsA ?? score?.sets_a ?? 0);
        const setsB = Number(score?.setsB ?? score?.sets_b ?? 0);

        const { pointsA, pointsB } = getLvcMatchPoints(setsA, setsB);

        if (standings[teamAId]) {
            standings[teamAId].pj += 1;
            standings[teamAId].setsFavor += setsA;
            standings[teamAId].setsAgainst += setsB;
            standings[teamAId].points += pointsA;

            if (setsA > setsB) {
                standings[teamAId].pg += 1;
            } else if (setsB > setsA) {
                standings[teamAId].pp += 1;
            }
        }

        if (standings[teamBId]) {
            standings[teamBId].pj += 1;
            standings[teamBId].setsFavor += setsB;
            standings[teamBId].setsAgainst += setsA;
            standings[teamBId].points += pointsB;

            if (setsB > setsA) {
                standings[teamBId].pg += 1;
            } else if (setsA > setsB) {
                standings[teamBId].pp += 1;
            }
        }
    });

    return Object.values(standings).sort((a, b) => {
        // 1. Mayor cantidad de puntos
        if (b.points !== a.points) return b.points - a.points;
        // 2. Mayor cantidad de partidos ganados
        if (b.pg !== a.pg) return b.pg - a.pg;
        // 3. Mejor diferencia de sets (Sets a favor - Sets en contra)
        const diffA = a.setsFavor - a.setsAgainst;
        const diffB = b.setsFavor - b.setsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        // 4. Mayor cantidad de sets a favor
        return b.setsFavor - a.setsFavor;
    });
};
