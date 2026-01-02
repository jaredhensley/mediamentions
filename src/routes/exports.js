/**
 * @fileoverview Export route handlers for mentions and reports
 */

const { runQuery } = require('../db');
const { sendJson, escapeXml, formatDisplayDate } = require('../utils/http');
const { validate, idParamSchema } = require('../schemas');
const { exportRateLimiter, adminExportRateLimiter } = require('../middleware/rateLimit');

/**
 * Wrap a handler with rate limiting middleware
 * @param {Function} handler - Route handler function
 * @param {Function} rateLimiter - Rate limit middleware
 * @returns {Function} - Wrapped handler with rate limiting
 */
function withRateLimit(handler, rateLimiter) {
  return async (req, res, params) => {
    return new Promise((resolve) => {
      rateLimiter(req, res, async () => {
        await handler(req, res, params);
        resolve();
      });
      // If rate limiter blocks the request, it sends a response and doesn't call next
      setImmediate(() => {
        if (res.writableEnded) resolve();
      });
    });
  };
}

/**
 * Build Excel XML content for mentions export
 * @param {Array} rows - Data rows to export
 * @param {Object} options - Export options
 * @param {string} [options.clientName] - Client name for title row
 * @returns {string} Excel XML content
 */
function buildExcelXml(rows, { clientName } = {}) {
  const styles = `
    <Styles>
      <Style ss:ID="Title">
        <Font ss:Bold="1" ss:Size="14" />
      </Style>
      <Style ss:ID="Header">
        <Font ss:Bold="1" />
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
        <Interior ss:Color="#E8EDF5" ss:Pattern="Solid" />
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        </Borders>
      </Style>
      <Style ss:ID="Cell">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        </Borders>
      </Style>
      <Style ss:ID="Date" ss:Parent="Cell">
        <NumberFormat ss:Format="mmm d, yyyy h:mm AM/PM" />
      </Style>
      <Style ss:ID="Link" ss:Parent="Cell">
        <Font ss:Color="#0563C1" ss:Underline="Single" />
      </Style>
    </Styles>`;

  const columns = [
    { title: 'Date', width: 120, style: 'Date' },
    { title: 'Publication Name', width: 180, style: 'Cell' },
    { title: 'Title', width: 300, style: 'Cell' },
    { title: 'Topic', width: 160, style: 'Cell' },
    { title: 'Additional Mentions', width: 160, style: 'Cell' },
    { title: 'Link', width: 220, style: 'Link' }
  ];

  const header = `<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${styles}
    <Worksheet ss:Name="Media Mentions">
      <Table>`;
  const footer = '</Table></Worksheet></Workbook>';
  const titleRow = clientName
    ? `<Row><Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `${clientName} Media Mentions`
      )}</Data></Cell></Row>`
    : '';
  const columnDefs = columns
    .map((col) => `<Column ss:AutoFitWidth="0" ss:Width="${col.width}" />`)
    .join('');
  const headerRow = `<Row>${columns
    .map(
      (col) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>`
    )
    .join('')}</Row>`;
  const dataRows = rows
    .map((row) => {
      const values = [
        formatDisplayDate(row.mentionDate) || '',
        row.source || row.publicationName || '',
        row.title || '',
        row.subjectMatter || '',
        formatDisplayDate(row.reMentionDate) || '',
        row.link || ''
      ];

      return `<Row>${values
        .map((value, idx) => {
          const style = columns[idx].style;
          const hrefAttr = idx === 5 && value ? ` ss:HRef="${escapeXml(value)}"` : '';
          return `<Cell ss:StyleID="${style}"${hrefAttr}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
        })
        .join('')}</Row>`;
    })
    .join('');

  return `${header}${columnDefs}${titleRow}${headerRow}${dataRows}${footer}`;
}

/**
 * Escape a value for CSV output
 * @param {*} value - Value to escape
 * @returns {string} Escaped CSV value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportMentions(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const clientId = validation.data.id;
  const [client] = runQuery('SELECT name FROM clients WHERE id=@p0;', [clientId]);
  const url = new URL(_req.url, 'http://localhost');
  const filters = ['mm.clientId=@p0'];
  const values = [clientId];
  if (url.searchParams.get('publicationId')) {
    values.push(Number(url.searchParams.get('publicationId')));
    filters.push(`mm.publicationId=@p${values.length - 1}`);
  }
  if (url.searchParams.get('startDate')) {
    values.push(url.searchParams.get('startDate'));
    filters.push(`mm.mentionDate >= @p${values.length - 1}`);
  }
  if (url.searchParams.get('endDate')) {
    values.push(url.searchParams.get('endDate'));
    filters.push(`mm.mentionDate <= @p${values.length - 1}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = runQuery(
    `SELECT mm.mentionDate, COALESCE(mm.source, p.name) as source, p.name as publicationName, mm.title, mm.subjectMatter, mm.reMentionDate, mm.link
     FROM mediaMentions mm
     LEFT JOIN publications p ON mm.publicationId = p.id
     ${whereClause}
     ORDER BY mm.mentionDate DESC, mm.id DESC;`,
    values
  );
  const xml = buildExcelXml(rows, { clientName: client?.name });
  res.writeHead(200, {
    'Content-Type': 'application/vnd.ms-excel',
    'Content-Disposition': `attachment; filename="media-mentions-${client?.name || clientId}.xls"`
  });
  res.end(xml);
}

function exportFalsePositives(req, res) {
  const mentions = runQuery(`
    SELECT
      m.id,
      c.name as clientName,
      m.title,
      m.link,
      m.source,
      m.mentionDate,
      m.createdAt,
      m.verified
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    WHERE m.verified = 0
    ORDER BY m.createdAt DESC
  `);

  const headers = [
    'Client',
    'Title',
    'URL',
    'Source',
    'Mention Date',
    'Created At',
    'Verified',
    'ID'
  ];

  const rows = [headers.join(',')];
  mentions.forEach((m) => {
    rows.push(
      [m.clientName, m.title, m.link, m.source, m.mentionDate, m.createdAt, m.verified, m.id]
        .map(escapeCSV)
        .join(',')
    );
  });

  const csv = rows.join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="false-positives-${new Date().toISOString().split('T')[0]}.csv"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(csv);
}

function exportDeletedMentions(req, res) {
  const mentions = runQuery(`
    SELECT
      id,
      originalMentionId,
      clientName,
      title,
      link,
      source,
      mentionDate,
      status,
      verified,
      deletedAt
    FROM deletedMentions
    ORDER BY deletedAt DESC
  `);

  const headers = [
    'Client',
    'Title',
    'URL',
    'Source',
    'Mention Date',
    'Status',
    'Verified',
    'Deleted At',
    'Original ID',
    'Deleted ID'
  ];

  const rows = [headers.join(',')];
  mentions.forEach((m) => {
    rows.push(
      [
        m.clientName,
        m.title,
        m.link,
        m.source,
        m.mentionDate,
        m.status,
        m.verified,
        m.deletedAt,
        m.originalMentionId,
        m.id
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  const csv = rows.join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="deleted-mentions-${new Date().toISOString().split('T')[0]}.csv"`,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(csv);
}

const routes = [
  {
    method: 'GET',
    pattern: '/clients/:id/mentions/export',
    handler: withRateLimit(exportMentions, exportRateLimiter)
  },
  {
    method: 'GET',
    pattern: '/api/clients/:id/mentions/export',
    handler: withRateLimit(exportMentions, exportRateLimiter)
  },
  {
    method: 'GET',
    pattern: '/admin/false-positives/export',
    handler: withRateLimit(exportFalsePositives, adminExportRateLimiter)
  },
  {
    method: 'GET',
    pattern: '/admin/deleted-mentions/export',
    handler: withRateLimit(exportDeletedMentions, adminExportRateLimiter)
  }
];

module.exports = {
  routes,
  buildExcelXml,
  escapeCSV,
  exportMentions,
  exportFalsePositives,
  exportDeletedMentions
};
