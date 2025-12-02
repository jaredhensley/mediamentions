const { runQuery, runExecute } = require('../db');
const { cleanSnippet } = require('../utils/mentions');

function cleanExistingSnippets() {
  console.log('Starting to clean existing subjectMatter fields...\n');

  // Get all mentions with subjectMatter
  const mentions = runQuery('SELECT id, subjectMatter FROM mediaMentions WHERE subjectMatter IS NOT NULL;');

  console.log(`Found ${mentions.length} mentions to process`);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const mention of mentions) {
    const original = mention.subjectMatter;
    const cleaned = cleanSnippet(original);

    if (cleaned !== original) {
      runExecute('UPDATE mediaMentions SET subjectMatter = @p0, updatedAt = @p1 WHERE id = @p2;', [
        cleaned,
        new Date().toISOString(),
        mention.id
      ]);
      updatedCount++;

      // Show first few examples
      if (updatedCount <= 5) {
        console.log(`\nExample ${updatedCount}:`);
        console.log(`  Before: "${original.substring(0, 80)}..."`);
        console.log(`  After:  "${cleaned.substring(0, 80)}..."`);
      }
    } else {
      unchangedCount++;
    }
  }

  console.log(`\n✓ Cleaning complete!`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Unchanged: ${unchangedCount}`);
  console.log(`  Total: ${mentions.length}`);
}

// Run the migration
cleanExistingSnippets();
