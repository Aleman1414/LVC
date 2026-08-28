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

        if (standings[teamAId]) {
            standings[teamAId].pj += 1;
            standings[teamAId].setsFavor += setsA;
            standings[teamAId].setsAgainst += setsB;
            if (setsA > setsB) {
                standings[teamAId].pg += 1;
                standings[teamAId].points += (setsA === 3 && setsB < 2) ? 3 : 2;
            } else {
                standings[teamAId].pp += 1;
                standings[teamAId].points += (setsB === 3 && setsA === 2) ? 1 : 0;
            }
        }

        if (standings[teamBId]) {
            standings[teamBId].pj += 1;
            standings[teamBId].setsFavor += setsB;
            standings[teamBId].setsAgainst += setsA;
            if (setsB > setsA) {
                standings[teamBId].pg += 1;
                standings[teamBId].points += (setsB === 3 && setsA < 2) ? 3 : 2;
            } else {
                standings[teamBId].pp += 1;
                standings[teamBId].points += (setsA === 3 && setsB === 2) ? 1 : 0;
            }
        }
    });

    return Object.values(standings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.setsFavor - a.setsAgainst;
        const diffB = b.setsFavor - b.setsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.setsFavor - a.setsFavor;
    });
};
