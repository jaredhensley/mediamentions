/**
 * @fileoverview Route handlers for all API endpoints
 */

const { runQuery } = require('../db');
const { parseJsonBody, sendJson, escapeXml, formatDisplayDate, buildUpdateFields } = require('../utils/http');
const { getStatus: getVerificationStatus } = require('../services/verificationStatus');
const {
  validate,
  createClientSchema,
  updateClientSchema,
  createPublicationSchema,
  updatePublicationSchema,
  createPressReleaseSchema,
  updatePressReleaseSchema,
  createMediaMentionSchema,
  updateMediaMentionSchema,
  createFeedbackSummarySchema,
  updateFeedbackSummarySchema,
  createSearchJobSchema,
  updateSearchJobSchema,
  idParamSchema
} = require('../schemas');

// ============================================================================
// CLIENT ROUTES
// ============================================================================

async function listClients(_req, res) {
  const clients = runQuery('SELECT * FROM clients ORDER BY id;');
  sendJson(res, 200, clients);
}

async function createClient(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createClientSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [client] = runQuery(
      'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
      [validation.data.name, validation.data.contactEmail, now],
    );
    sendJson(res, 201, client);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getClient(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [client] = runQuery('SELECT * FROM clients WHERE id=@p0;', [validation.data.id]);
  if (!client) {
    sendJson(res, 404, { error: 'Client not found' });
    return;
  }
  sendJson(res, 200, client);
}

async function updateClient(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updateClientSchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, ['name', 'contactEmail']);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [client] = runQuery(
    `UPDATE clients SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!client) {
    sendJson(res, 404, { error: 'Client not found' });
    return;
  }
  sendJson(res, 200, client);
}

async function deleteClient(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [client] = runQuery('DELETE FROM clients WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!client) {
    sendJson(res, 404, { error: 'Client not found' });
    return;
  }
  sendJson(res, 200, client);
}

// ============================================================================
// PUBLICATION ROUTES
// ============================================================================

async function listPublications(_req, res) {
  const publications = runQuery("SELECT * FROM publications WHERE name != 'Unknown Source' ORDER BY id;");
  sendJson(res, 200, publications);
}

async function createPublication(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createPublicationSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [publication] = runQuery(
      'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
      [validation.data.name, validation.data.website || null, validation.data.clientId || null, now],
    );
    sendJson(res, 201, publication);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getPublication(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [publication] = runQuery('SELECT * FROM publications WHERE id=@p0;', [validation.data.id]);
  if (!publication) {
    sendJson(res, 404, { error: 'Publication not found' });
    return;
  }
  sendJson(res, 200, publication);
}

async function updatePublication(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updatePublicationSchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, ['name', 'website', 'clientId']);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [publication] = runQuery(
    `UPDATE publications SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!publication) {
    sendJson(res, 404, { error: 'Publication not found' });
    return;
  }
  sendJson(res, 200, publication);
}

async function deletePublication(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [publication] = runQuery('DELETE FROM publications WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!publication) {
    sendJson(res, 404, { error: 'Publication not found' });
    return;
  }
  sendJson(res, 200, publication);
}

// ============================================================================
// PRESS RELEASE ROUTES
// ============================================================================

async function listPressReleases(_req, res) {
  const releases = runQuery('SELECT * FROM pressReleases ORDER BY id;');
  sendJson(res, 200, releases);
}

async function createPressRelease(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createPressReleaseSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const now = new Date().toISOString();
    const [pressRelease] = runQuery(
      'INSERT INTO pressReleases (title, content, releaseDate, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [validation.data.title, validation.data.content || '', validation.data.releaseDate, validation.data.clientId, now],
    );
    sendJson(res, 201, pressRelease);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getPressRelease(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [pressRelease] = runQuery('SELECT * FROM pressReleases WHERE id=@p0;', [validation.data.id]);
  if (!pressRelease) {
    sendJson(res, 404, { error: 'Press release not found' });
    return;
  }
  sendJson(res, 200, pressRelease);
}

async function updatePressRelease(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updatePressReleaseSchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, ['title', 'content', 'releaseDate', 'clientId']);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [pressRelease] = runQuery(
    `UPDATE pressReleases SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!pressRelease) {
    sendJson(res, 404, { error: 'Press release not found' });
    return;
  }
  sendJson(res, 200, pressRelease);
}

async function deletePressRelease(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [pressRelease] = runQuery('DELETE FROM pressReleases WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!pressRelease) {
    sendJson(res, 404, { error: 'Press release not found' });
    return;
  }
  sendJson(res, 200, pressRelease);
}

// ============================================================================
// MEDIA MENTION ROUTES
// ============================================================================

async function listMediaMentions(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const filters = [];
  const params = [];
  if (url.searchParams.get('clientId')) {
    params.push(Number(url.searchParams.get('clientId')));
    filters.push(`clientId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('publicationId')) {
    params.push(Number(url.searchParams.get('publicationId')));
    filters.push(`publicationId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('pressReleaseId')) {
    params.push(Number(url.searchParams.get('pressReleaseId')));
    filters.push(`pressReleaseId=@p${params.length - 1}`);
  }
  if (url.searchParams.get('startDate')) {
    params.push(url.searchParams.get('startDate'));
    filters.push(`mentionDate >= @p${params.length - 1}`);
  }
  if (url.searchParams.get('endDate')) {
    params.push(url.searchParams.get('endDate'));
    filters.push(`mentionDate <= @p${params.length - 1}`);
  }
  if (url.searchParams.get('subject')) {
    params.push(`%${url.searchParams.get('subject')}%`);
    filters.push(`subjectMatter LIKE @p${params.length - 1}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const mentions = runQuery(
    `SELECT * FROM mediaMentions ${whereClause} ORDER BY mentionDate DESC, id DESC;`,
    params,
  );
  sendJson(res, 200, mentions);
}

async function createMediaMention(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createMediaMentionSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [mention] = runQuery(
      `INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, pressReleaseId, createdAt, updatedAt)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p11) RETURNING *;`,
      [
        d.title,
        d.subjectMatter || '',
        d.mentionDate,
        d.reMentionDate || null,
        d.link || '',
        d.source || null,
        d.sentiment || null,
        d.status || 'new',
        d.clientId,
        d.publicationId,
        d.pressReleaseId || null,
        now,
      ],
    );
    sendJson(res, 201, mention);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getMediaMention(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [mention] = runQuery('SELECT * FROM mediaMentions WHERE id=@p0;', [validation.data.id]);
  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }
  sendJson(res, 200, mention);
}

async function updateMediaMention(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updateMediaMentionSchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, [
    'title',
    'subjectMatter',
    'mentionDate',
    'reMentionDate',
    'link',
    'source',
    'sentiment',
    'status',
    'clientId',
    'publicationId',
    'pressReleaseId',
    'verified',
  ]);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [mention] = runQuery(
    `UPDATE mediaMentions SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }
  sendJson(res, 200, mention);
}

async function deleteMediaMention(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [mention] = runQuery('DELETE FROM mediaMentions WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }
  sendJson(res, 200, mention);
}

// ============================================================================
// FEEDBACK SUMMARY ROUTES
// ============================================================================

async function listFeedbackSummaries(_req, res) {
  const summaries = runQuery('SELECT * FROM feedbackSummaries ORDER BY id;');
  sendJson(res, 200, summaries);
}

async function createFeedbackSummary(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createFeedbackSummarySchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [summary] = runQuery(
      'INSERT INTO feedbackSummaries (clientId, summary, rating, period, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [d.clientId, d.summary, d.rating || null, d.period || null, now],
    );
    sendJson(res, 201, summary);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getFeedbackSummary(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [summary] = runQuery('SELECT * FROM feedbackSummaries WHERE id=@p0;', [validation.data.id]);
  if (!summary) {
    sendJson(res, 404, { error: 'Feedback summary not found' });
    return;
  }
  sendJson(res, 200, summary);
}

async function updateFeedbackSummary(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updateFeedbackSummarySchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, ['clientId', 'summary', 'rating', 'period']);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [summary] = runQuery(
    `UPDATE feedbackSummaries SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!summary) {
    sendJson(res, 404, { error: 'Feedback summary not found' });
    return;
  }
  sendJson(res, 200, summary);
}

async function deleteFeedbackSummary(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [summary] = runQuery('DELETE FROM feedbackSummaries WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!summary) {
    sendJson(res, 404, { error: 'Feedback summary not found' });
    return;
  }
  sendJson(res, 200, summary);
}

// ============================================================================
// SEARCH JOB ROUTES
// ============================================================================

async function listSearchJobs(_req, res) {
  const jobs = runQuery('SELECT * FROM searchJobs ORDER BY id;');
  sendJson(res, 200, jobs);
}

async function createSearchJob(req, res) {
  try {
    const body = await parseJsonBody(req);
    const validation = validate(createSearchJobSchema, body);
    if (!validation.success) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const d = validation.data;
    const now = new Date().toISOString();
    const [job] = runQuery(
      'INSERT INTO searchJobs (clientId, query, status, scheduledAt, completedAt, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p5) RETURNING *;',
      [d.clientId, d.query, d.status || 'pending', d.scheduledAt, d.completedAt || null, now],
    );
    sendJson(res, 201, job);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getSearchJob(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [job] = runQuery('SELECT * FROM searchJobs WHERE id=@p0;', [validation.data.id]);
  if (!job) {
    sendJson(res, 404, { error: 'Search job not found' });
    return;
  }
  sendJson(res, 200, job);
}

async function updateSearchJob(req, res, params) {
  const idValidation = validate(idParamSchema, params);
  if (!idValidation.success) {
    sendJson(res, 400, { error: idValidation.error });
    return;
  }
  const body = await parseJsonBody(req);
  const validation = validate(updateSearchJobSchema, body);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const { keys, values } = buildUpdateFields(validation.data, ['clientId', 'query', 'status', 'scheduledAt', 'completedAt']);
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(idValidation.data.id);
  const assignment = keys.map((key, idx) => `${key}=@p${idx}`).join(', ');
  const [job] = runQuery(
    `UPDATE searchJobs SET ${assignment} WHERE id=@p${values.length - 1} RETURNING *;`,
    values,
  );
  if (!job) {
    sendJson(res, 404, { error: 'Search job not found' });
    return;
  }
  sendJson(res, 200, job);
}

async function deleteSearchJob(_req, res, params) {
  const validation = validate(idParamSchema, params);
  if (!validation.success) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  const [job] = runQuery('DELETE FROM searchJobs WHERE id=@p0 RETURNING *;', [validation.data.id]);
  if (!job) {
    sendJson(res, 404, { error: 'Search job not found' });
    return;
  }
  sendJson(res, 200, job);
}

// ============================================================================
// EXPORT ROUTES
// ============================================================================

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
        <NumberFormat ss:Format="mmm d, yyyy\ h:mm\ AM/PM" />
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
    { title: 'Link', width: 220, style: 'Link' },
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
        `${clientName} Media Mentions`,
      )}</Data></Cell></Row>`
    : '';
  const columnDefs = columns
    .map((col) => `<Column ss:AutoFitWidth="0" ss:Width="${col.width}" />`)
    .join('');
  const headerRow = `<Row>${columns
    .map((col) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>`)
    .join('')}</Row>`;
  const dataRows = rows
    .map((row) => {
      const values = [
        formatDisplayDate(row.mentionDate) || '',
        row.source || row.publicationName || '',
        row.title || '',
        row.subjectMatter || '',
        formatDisplayDate(row.reMentionDate) || '',
        row.link || '',
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
    values,
  );
  const xml = buildExcelXml(rows, { clientName: client?.name });
  res.writeHead(200, {
    'Content-Type': 'application/vnd.ms-excel',
    'Content-Disposition': `attachment; filename="media-mentions-${client?.name || clientId}.xls"`,
  });
  res.end(xml);
}

function verificationStatus(_req, res) {
  const status = getVerificationStatus();
  sendJson(res, 200, status);
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

  const headers = ['Client', 'Title', 'URL', 'Source', 'Mention Date', 'Created At', 'Verified', 'ID'];
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];
  mentions.forEach(m => {
    rows.push([
      m.clientName,
      m.title,
      m.link,
      m.source,
      m.mentionDate,
      m.createdAt,
      m.verified,
      m.id
    ].map(escapeCSV).join(','));
  });

  const csv = rows.join('\n');

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="false-positives-${new Date().toISOString().split('T')[0]}.csv"`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(csv);
}

// ============================================================================
// PENDING REVIEW HANDLERS
// ============================================================================

function listPendingReview(req, res) {
  const mentions = runQuery(`
    SELECT
      m.id,
      m.title,
      m.link,
      m.source,
      m.mentionDate,
      m.createdAt,
      m.verified,
      c.name as clientName,
      c.id as clientId
    FROM mediaMentions m
    JOIN clients c ON m.clientId = c.id
    WHERE m.verified IS NULL
    ORDER BY m.createdAt DESC
  `);

  sendJson(res, 200, mentions);
}

function acceptPendingReview(req, res, params) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return sendJson(res, 400, { error: 'Invalid ID' });
  }

  const mention = runQuery('SELECT * FROM mediaMentions WHERE id = @p0', [id])[0];
  if (!mention) {
    return sendJson(res, 404, { error: 'Mention not found' });
  }

  if (mention.verified !== null) {
    return sendJson(res, 400, { error: 'Mention is not pending review' });
  }

  runQuery('UPDATE mediaMentions SET verified = 1 WHERE id = @p0', [id]);
  sendJson(res, 200, { success: true, id, verified: 1 });
}

function rejectPendingReview(req, res, params) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return sendJson(res, 400, { error: 'Invalid ID' });
  }

  const mention = runQuery('SELECT * FROM mediaMentions WHERE id = @p0', [id])[0];
  if (!mention) {
    return sendJson(res, 404, { error: 'Mention not found' });
  }

  if (mention.verified !== null) {
    return sendJson(res, 400, { error: 'Mention is not pending review' });
  }

  runQuery('UPDATE mediaMentions SET verified = 0 WHERE id = @p0', [id]);
  sendJson(res, 200, { success: true, id, verified: 0 });
}

function getPendingReviewCount(req, res) {
  const result = runQuery('SELECT COUNT(*) as count FROM mediaMentions WHERE verified IS NULL')[0];
  sendJson(res, 200, { count: result?.count || 0 });
}

// ============================================================================
// ROUTE TABLE
// ============================================================================

const routes = [
  { method: 'GET', pattern: '/clients', handler: listClients },
  { method: 'POST', pattern: '/clients', handler: createClient },
  { method: 'GET', pattern: '/clients/:id', handler: getClient },
  { method: 'PUT', pattern: '/clients/:id', handler: updateClient },
  { method: 'DELETE', pattern: '/clients/:id', handler: deleteClient },

  { method: 'GET', pattern: '/publications', handler: listPublications },
  { method: 'POST', pattern: '/publications', handler: createPublication },
  { method: 'GET', pattern: '/publications/:id', handler: getPublication },
  { method: 'PUT', pattern: '/publications/:id', handler: updatePublication },
  { method: 'DELETE', pattern: '/publications/:id', handler: deletePublication },

  { method: 'GET', pattern: '/press-releases', handler: listPressReleases },
  { method: 'POST', pattern: '/press-releases', handler: createPressRelease },
  { method: 'GET', pattern: '/press-releases/:id', handler: getPressRelease },
  { method: 'PUT', pattern: '/press-releases/:id', handler: updatePressRelease },
  { method: 'DELETE', pattern: '/press-releases/:id', handler: deletePressRelease },

  { method: 'GET', pattern: '/media-mentions', handler: listMediaMentions },
  { method: 'POST', pattern: '/media-mentions', handler: createMediaMention },
  { method: 'GET', pattern: '/media-mentions/:id', handler: getMediaMention },
  { method: 'PUT', pattern: '/media-mentions/:id', handler: updateMediaMention },
  { method: 'DELETE', pattern: '/media-mentions/:id', handler: deleteMediaMention },

  { method: 'GET', pattern: '/feedback-summaries', handler: listFeedbackSummaries },
  { method: 'POST', pattern: '/feedback-summaries', handler: createFeedbackSummary },
  { method: 'GET', pattern: '/feedback-summaries/:id', handler: getFeedbackSummary },
  { method: 'PUT', pattern: '/feedback-summaries/:id', handler: updateFeedbackSummary },
  { method: 'DELETE', pattern: '/feedback-summaries/:id', handler: deleteFeedbackSummary },

  { method: 'GET', pattern: '/search-jobs', handler: listSearchJobs },
  { method: 'POST', pattern: '/search-jobs', handler: createSearchJob },
  { method: 'GET', pattern: '/search-jobs/:id', handler: getSearchJob },
  { method: 'PUT', pattern: '/search-jobs/:id', handler: updateSearchJob },
  { method: 'DELETE', pattern: '/search-jobs/:id', handler: deleteSearchJob },

  { method: 'GET', pattern: '/clients/:id/mentions/export', handler: exportMentions },
  { method: 'GET', pattern: '/api/clients/:id/mentions/export', handler: exportMentions },
  { method: 'GET', pattern: '/admin/false-positives/export', handler: exportFalsePositives },
  { method: 'GET', pattern: '/api/verification-status', handler: verificationStatus },

  { method: 'GET', pattern: '/admin/pending-review', handler: listPendingReview },
  { method: 'GET', pattern: '/admin/pending-review/count', handler: getPendingReviewCount },
  { method: 'POST', pattern: '/admin/pending-review/:id/accept', handler: acceptPendingReview },
  { method: 'POST', pattern: '/admin/pending-review/:id/reject', handler: rejectPendingReview },
];

module.exports = {
  routes
};
