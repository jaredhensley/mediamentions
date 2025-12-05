const { runQuery } = require('./src/db');

async function checkAutomatedEFI() {
    console.log('='.repeat(80));
    console.log('AUTOMATED EFI SEARCH RESULTS');
    console.log('='.repeat(80));

    // Get client ID
    const clients = await runQuery('SELECT id, name FROM clients WHERE name LIKE "%Equitable Food%"');
    console.log('\nClient found:', clients);

    if (clients.length === 0) {
        console.log('No EFI client found!');
        return;
    }

    const clientId = clients[0].id;

    // Get all mentions for this client
    const mentions = await runQuery(
        `SELECT id, title, link, source, subjectMatter, mentionDate, createdAt
         FROM mediaMentions
         WHERE clientId = ?
         ORDER BY mentionDate DESC`,
        [clientId]
    );

    console.log(`\nTotal mentions found: ${mentions.length}`);

    // Filter by date range: June 7 - Dec 4, 2025
    const startDate = new Date('2025-06-07');
    const endDate = new Date('2025-12-04');

    const mentionsInRange = mentions.filter(m => {
        const date = new Date(m.mentionDate);
        return date >= startDate && date <= endDate;
    });

    console.log(`Mentions in date range (2025-06-07 to 2025-12-04): ${mentionsInRange.length}`);

    console.log('\n' + '='.repeat(80));
    console.log('ALL AUTOMATED MENTIONS (sorted by date):');
    console.log('='.repeat(80));

    mentionsInRange.forEach((m, idx) => {
        console.log(`\n${idx + 1}. Date: ${m.mentionDate}`);
        console.log(`   Title: ${m.title}`);
        console.log(`   Source: ${m.source}`);
        console.log(`   URL: ${m.link}`);
        if (m.subjectMatter) {
            console.log(`   Subject: ${m.subjectMatter.substring(0, 100)}...`);
        }
    });

    // Analyze patterns
    console.log('\n' + '='.repeat(80));
    console.log('PATTERN ANALYSIS OF AUTOMATED RESULTS');
    console.log('='.repeat(80));

    const titleWithEFI = mentionsInRange.filter(m =>
        m.title && (m.title.toLowerCase().includes('efi') || m.title.toLowerCase().includes('equitable food'))
    ).length;

    const titleWithoutEFI = mentionsInRange.length - titleWithEFI;

    console.log(`\nMentions with EFI/Equitable Food in title: ${titleWithEFI}`);
    console.log(`Mentions with EFI/Equitable Food only in body: ${titleWithoutEFI}`);

    // Group by source
    const bySource = {};
    mentionsInRange.forEach(m => {
        const source = m.source || 'Unknown';
        bySource[source] = (bySource[source] || 0) + 1;
    });

    console.log('\nMentions by source:');
    Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
            console.log(`  ${source}: ${count}`);
        });

    // Check for specific high-value missed mentions
    console.log('\n' + '='.repeat(80));
    console.log('CHECKING FOR SPECIFIC MISSED MENTIONS');
    console.log('='.repeat(80));

    const missedExamples = [
        'Titan Farms recognized',
        'Future Hold for Labor',
        'Amalia Zimmerman-Lommel',
        'Frieda Rapoport Caplan',
        'ECIP Closes Second Year',
        'Leadership Circle',
        'Fresh Express Achieves',
        'National Hispanic Heritage Month'
    ];

    missedExamples.forEach(keyword => {
        const found = mentionsInRange.find(m =>
            (m.title && m.title.includes(keyword)) ||
            (m.subjectMatter && m.subjectMatter.includes(keyword))
        );
        console.log(`\n"${keyword}": ${found ? 'FOUND ✓' : 'MISSED ✗'}`);
        if (found) {
            console.log(`  Title: ${found.title}`);
        }
    });
}

checkAutomatedEFI().catch(console.error);
