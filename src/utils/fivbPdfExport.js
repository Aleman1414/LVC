import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates an official FIVB scoresheet PDF export based on match and scoresheet data.
 */
export const exportFIVBScoresheetPDF = (match, scoresheet, teamA, teamB) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const meta = scoresheet?.metadata || {};
    const sets = scoresheet?.sets || [];
    const officials = scoresheet?.officials || {};
    const sanctions = scoresheet?.sanctions || [];
    const rosterA = scoresheet?.rosterA || {};
    const rosterB = scoresheet?.rosterB || {};

    // Header background & border
    doc.setFillColor(248, 250, 252);
    doc.rect(5, 5, 287, 200, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 287, 200, 'S');

    // Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('LIGA DE VOLEIBOL DE COMAYAGUA (LVC)', 148, 11, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('HOJA DE ANOTACIÓN OFICIAL - PROTOCOLO FIVB', 148, 15, { align: 'center' });

    // Competition info bar
    doc.setFontSize(7);
    doc.setFillColor(226, 232, 240);
    doc.rect(7, 18, 283, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(`Competición: ${meta.competition || 'Campeonato LVC'}`, 9, 22);
    doc.text(`Sede: ${meta.hall || 'Gimnasio Municipal'} (${meta.city || 'Comayagua'}, ${meta.countryCode || 'HON'})`, 9, 26);
    doc.text(`Fecha: ${meta.date || match?.date || '-'}`, 120, 22);
    doc.text(`Hora: ${meta.time || match?.time || '-'}`, 120, 26);
    doc.text(`Partido N°: ${meta.matchNumber || match?.round || '1'}`, 180, 22);
    doc.text(`División: ${meta.division || 'General'}`, 180, 26);
    doc.text(`EQUIPOS: [A] ${rosterA.teamName || teamA?.name}  VS  [B] ${rosterB.teamName || teamB?.name}`, 220, 24);

    // Results Summary Table
    let startY = 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('RESUMEN DE RESULTADOS (RESULTS)', 148, startY, { align: 'center' });

    const tableRows = [];
    let totPtsA = 0, totPtsB = 0, totSetsA = 0, totSetsB = 0;

    for (let s = 0; s < 5; s++) {
        const setObj = sets[s] || {};
        const ptsA = setObj.teamA?.points ?? 0;
        const ptsB = setObj.teamB?.points ?? 0;
        const wonA = ptsA > ptsB && (ptsA >= (s === 4 ? 15 : 25)) ? 1 : 0;
        const wonB = ptsB > ptsA && (ptsB >= (s === 4 ? 15 : 25)) ? 1 : 0;
        const dur = setObj.startTime && setObj.endTime ? `${setObj.startTime}-${setObj.endTime}` : '-';

        totPtsA += ptsA;
        totPtsB += ptsB;
        totSetsA += wonA;
        totSetsB += wonB;

        const subsA = (setObj.teamA?.substitutes || []).filter(Boolean).length;
        const subsB = (setObj.teamB?.substitutes || []).filter(Boolean).length;
        const toA = (setObj.teamA?.timeouts || []).filter(Boolean).length;
        const toB = (setObj.teamB?.timeouts || []).filter(Boolean).length;

        tableRows.push([
            toA, subsA, wonA, ptsA,
            `SET ${s + 1} (${dur})`,
            ptsB, wonB, subsB, toB
        ]);
    }

    tableRows.push([
        '-', '-', totSetsA, totPtsA,
        'TOTALES',
        totPtsB, totSetsB, '-', '-'
    ]);

    doc.autoTable({
        startY: 34,
        head: [[
            'T', 'S', 'W', 'Puntos A',
            'SET / DURACIÓN',
            'Puntos B', 'W', 'S', 'T'
        ]],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            4: { fontStyle: 'bold', fillColor: [241, 245, 249] }
        },
        margin: { left: 40, right: 40 }
    });

    const finalY = doc.lastAutoTable.finalY + 4;

    // Sets 1 to 5 Line-Up Preview
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ALINEACIONES INICIALES Y ROTACIÓN (I - VI)', 148, finalY, { align: 'center' });

    const lineupRows = [];
    sets.forEach((st, idx) => {
        const starA = st.teamA?.starters?.join(', ') || '-';
        const starB = st.teamB?.starters?.join(', ') || '-';
        lineupRows.push([
            `Set ${idx + 1}`,
            starA,
            `${st.teamA?.points || 0} - ${st.teamB?.points || 0}`,
            starB
        ]);
    });

    doc.autoTable({
        startY: finalY + 2,
        head: [['Set', `Equipo A (${teamA?.name})`, 'Marcador', `Equipo B (${teamB?.name})`]],
        body: lineupRows,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1.2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        margin: { left: 25, right: 25 }
    });

    const afterLineupsY = doc.lastAutoTable.finalY + 4;

    // Sanctions & Officials Grid
    doc.autoTable({
        startY: afterLineupsY,
        head: [['SANCIONES (SANCTIONS)', 'OFICIALES Y ÁRBITROS', 'OBSERVACIONES / PROTESTAS']],
        body: [
            [
                sanctions.length > 0
                    ? sanctions.map(sc => `Set ${sc.set}: [${sc.type}] Eq. ${sc.team} - N° ${sc.playerOrOfficial} (Marcador: ${sc.score || '-'})`).join('\n')
                    : 'Sin sanciones registradas.',
                `1er Árbitro: ${officials.referee1?.name || 'Por definir'}\n2do Árbitro: ${officials.referee2?.name || 'Por definir'}\nAnotador: ${officials.scorer?.name || 'Por definir'}\nAsistente: ${officials.assistantScorer?.name || 'Por definir'}`,
                scoresheet?.remarks || 'Ninguna observación registrada.'
            ]
        ],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [71, 85, 105], textColor: 255 },
        margin: { left: 10, right: 10 }
    });

    // Footer with Winner
    const winnerY = 195;
    const winnerName = totSetsA > totSetsB ? teamA?.name : (totSetsB > totSetsA ? teamB?.name : 'En juego');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`GANADOR DEL ENCUENTRO: ${winnerName}  (${Math.max(totSetsA, totSetsB)} - ${Math.min(totSetsA, totSetsB)})`, 148, winnerY, { align: 'center' });

    // Download PDF
    doc.save(`FIVB_Anotacion_Partido_${teamA?.name || 'A'}_vs_${teamB?.name || 'B'}.pdf`);
};
