/**
 * @fileoverview Cleanup script to remove duplicate mentions and ensure unique index exists
 * Run with: node src/scripts/cleanupDuplicates.js
 */

const { runQuery, runExecute } = require('../db');

function main() {
  console.log('[cleanup] Starting duplicate cleanup...');

  // Find duplicates
  const duplicates = runQuery(`
    SELECT link, clientId, COUNT(*) as count
    FROM mediaMentions
    GROUP BY link, clientId
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  if (duplicates.length === 0) {
    console.log('[cleanup] ✓ No duplicates found');
  } else {
    console.log(`[cleanup] Found ${duplicates.length} duplicate URL+client combinations`);

    let totalDeleted = 0;

    // For each duplicate, keep the oldest (smallest id) and delete the rest
    for (const dup of duplicates) {
      const mentions = runQuery(
        'SELECT id, title, createdAt FROM mediaMentions WHERE link = @p0 AND clientId = @p1 ORDER BY id ASC',
        [dup.link, dup.clientId]
      );

      const keepId = mentions[0].id;
      const deleteIds = mentions.slice(1).map((m) => m.id);

      console.log(
        `[cleanup] Link: ${dup.link.substring(0, 60)}... (${dup.count} copies) - keeping ID ${keepId}, deleting ${deleteIds.length}`
      );

      for (const id of deleteIds) {
        runExecute('DELETE FROM mediaMentions WHERE id = @p0', [id]);
        totalDeleted++;
      }
    }

    console.log(`[cleanup] ✓ Deleted ${totalDeleted} duplicate mentions`);
  }

  // Now try to create the unique index
  console.log('[cleanup] Creating unique index...');
  try {
    runExecute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_url_client_unique ON mediaMentions(link, clientId)'
    );
    console.log('[cleanup] ✓ Unique index created successfully');
  } catch (err) {
    console.error(`[cleanup] ✗ Failed to create unique index: ${err.message}`);
    console.error(
      '[cleanup] This should not happen if duplicates were cleaned up. Check for remaining duplicates.'
    );
    process.exit(1);
  }

  // Verify the index exists
  const indices = runQuery(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mentions_url_client_unique'"
  );
  if (indices.length > 0) {
    console.log('[cleanup] ✓ Verified unique index exists');
  } else {
    console.error('[cleanup] ✗ Unique index not found after creation attempt!');
    process.exit(1);
  }

  console.log('[cleanup] ✓ Cleanup complete!');
}

main();
