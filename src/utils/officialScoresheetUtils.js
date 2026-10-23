/**
 * Utilities for FIVB Official Volleyball Scoresheet & Technical Table
 * Implements official FIVB 2013+ rules for match recording:
 * - Positions I through VI
 * - Rotation and Service order
 * - Points recording (slashed 1-48, 1-30 in 5th set)
 * - Service rounds (1 to 8) tracking serving player and points scored during their turn
 * - Substitutions tracking (player in/out, scores of both teams at change, max 6 per set)
 * - Timeouts tracking (max 2 per set, scores of both teams at time of call)
 * - Sanctions (Improper request, Warning W, Penalty P, Expulsion E, Disqualification D)
 * - Deciding set court change at point 8
 */

export const LIGA_B_ID = 'a5bdd0e2-9fea-44c3-bbc4-50d056ffdcf0';
export const LIGA_FEMENINA_ID = '0296546d-b5b1-4b54-8950-45c252f51b8c';

/**
 * Checks if a match belongs to the experimental leagues (Liga B or Liga de Mujeres)
 */
export const isExperimentalLeague = (leagueId, leagueSlug = '', leagueName = '') => {
    if (!leagueId) return false;
    if (leagueId === LIGA_B_ID || leagueId === LIGA_FEMENINA_ID) return true;
    const slug = (leagueSlug || '').toLowerCase();
    const name = (leagueName || '').toLowerCase();
    return (
        slug.includes('liga-b') ||
        slug.includes('mujeres') ||
        slug.includes('femenin') ||
        name.includes('liga b') ||
        name.includes('mujeres') ||
        name.includes('femenin')
    );
};

/**
 * Creates default empty state for a set in the FIVB sheet
 */
export const createDefaultSetState = (setNum) => {
    const isFifth = setNum === 5;
    const maxPoints = isFifth ? 30 : 48;

    return {
        setNumber: setNum,
        startTime: '',
        endTime: '',
        servingTeam: 'A', // 'A' or 'B'
        receivingTeam: 'B',
        // In sets 1-4, Team A is left, Team B is right. In set 2, they swap courts.
        teamA: {
            starters: ['', '', '', '', '', ''], // Positions I, II, III, IV, V, VI
            substitutes: ['', '', '', '', '', ''], // Player number replacing starter
            subScores: ['', '', '', '', '', ''], // e.g. "3:7"
            subReEntryScores: ['', '', '', '', '', ''], // e.g. "7:9"
            // Service rounds 1 to 8: each item has array of 6 columns (for positions I-VI)
            // Storing the score when that player's service turn finished
            serviceRounds: [
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', '']
            ],
            timeouts: ['', ''], // Score at time-outs, e.g. "7:12", "21:23"
            points: 0,
            slashedPoints: [] // list of numbers slashed [1, 2, 3, ...]
        },
        teamB: {
            starters: ['', '', '', '', '', ''],
            substitutes: ['', '', '', '', '', ''],
            subScores: ['', '', '', '', '', ''],
            subReEntryScores: ['', '', '', '', '', ''],
            serviceRounds: [
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', '']
            ],
            timeouts: ['', ''],
            points: 0,
            slashedPoints: []
        },
        // Deciding set (5th set) specific fields
        fifthSetChangeCourt: {
            pointsAtChange: null, // Points scored by left team when 8th point was reached
            swappedAt: null
        },
        winner: null // 'A' | 'B' | null
    };
};

/**
 * Creates default complete official scoresheet structure
 */
export const createDefaultScoresheet = (match, teamA, teamB) => {
    return {
        version: '1.0',
        metadata: {
            competition: 'LVC - Campeonato Oficial',
            city: 'Comayagua',
            hall: match?.location || 'Gimnasio Municipal Comayagua',
            countryCode: 'HON',
            matchNumber: match?.round || '1',
            division: 'Senior',
            category: 'Oficial',
            date: match?.date || new Date().toISOString().split('T')[0],
            time: match?.time || '18:00',
            matchStartingTime: '',
            matchEndingTime: '',
            totalMatchDuration: ''
        },
        officials: {
            referee1: { name: '', country: 'HON', signature: false },
            referee2: { name: '', country: 'HON', signature: false },
            scorer: { name: '', country: 'HON', signature: false },
            assistantScorer: { name: '', country: 'HON', signature: false },
            lineJudges: ['', '', '', '']
        },
        rosterA: {
            teamName: teamA?.name || 'Equipo A',
            captainNumber: '',
            liberos: ['', ''],
            coach: '',
            assistantCoach1: '',
            assistantCoach2: '',
            therapist: '',
            doctor: '',
            players: [] // [{ number: '8', name: '...' }]
        },
        rosterB: {
            teamName: teamB?.name || 'Equipo B',
            captainNumber: '',
            liberos: ['', ''],
            coach: '',
            assistantCoach1: '',
            assistantCoach2: '',
            therapist: '',
            doctor: '',
            players: []
        },
        sets: [
            createDefaultSetState(1),
            createDefaultSetState(2),
            createDefaultSetState(3),
            createDefaultSetState(4),
            createDefaultSetState(5)
        ],
        sanctions: [
            // { type: 'W'|'P'|'E'|'D', improperRequest: false, playerOrOfficial: '13', team: 'A'|'B', set: 1, score: '17:15', delay: false }
        ],
        improperRequest: {
            teamA: false,
            teamB: false
        },
        remarks: '',
        winnerTeam: null // 'A' | 'B'
    };
};
