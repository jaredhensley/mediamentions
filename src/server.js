const http = require('http');
const { initializeDatabase, runQuery } = require('./db');
const { seedDefaultClients } = require('./utils/seedDefaultClients');
const { seedDefaultPublications } = require('./utils/seedDefaultPublications');
const { scheduleDailySearch } = require('./services/scheduler');
const { getStatus: getVerificationStatus } = require('./services/verificationStatus');
const { initWebSocket } = require('./services/websocket');
const { validateConfig, config } = require('./config');
const { requireApiKey } = require('./middleware/auth');

// Validate configuration before starting
validateConfig();

initializeDatabase();
seedDefaultClients();
seedDefaultPublications();

// Kick off scheduled searches and run one immediately to populate mentions.
(async () => {
  try {
    await scheduleDailySearch({ runImmediately: true });
  } catch (err) {
    console.error('[scheduler] failed to start search scheduler', err);
  }
})();

const PORT = process.env.PORT || 3000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        if (!chunks.length) {
          resolve({});
          return;
        }
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDisplayDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

function buildUpdateFields(body, allowedKeys) {
  const keys = [];
  const values = [];
  allowedKeys.forEach((key) => {
    if (body[key] !== undefined) {
      keys.push(key);
      values.push(body[key]);
    }
  });
  return { keys, values };
}

function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
}

async function listClients(_req, res) {
  const clients = runQuery('SELECT * FROM clients ORDER BY id;');
  sendJson(res, 200, clients);
}

async function createClient(req, res) {
  try {
    const body = await parseJsonBody(req);
    if (!body.name || !body.contactEmail) {
      sendJson(res, 400, { error: 'name and contactEmail are required' });
      return;
    }
    const now = new Date().toISOString();
    const [client] = runQuery(
      'INSERT INTO clients (name, contactEmail, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p2) RETURNING *;',
      [body.name, body.contactEmail, now],
    );
    sendJson(res, 201, client);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getClient(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid client id' });
    return;
  }
  const [client] = runQuery('SELECT * FROM clients WHERE id=@p0;', [id]);
  if (!client) {
    sendJson(res, 404, { error: 'Client not found' });
    return;
  }
  sendJson(res, 200, client);
}

async function updateClient(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid client id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, ['name', 'contactEmail']);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid client id' });
    return;
  }
  const [client] = runQuery('DELETE FROM clients WHERE id=@p0 RETURNING *;', [id]);
  if (!client) {
    sendJson(res, 404, { error: 'Client not found' });
    return;
  }
  sendJson(res, 200, client);
}

async function listPublications(_req, res) {
  const publications = runQuery('SELECT * FROM publications ORDER BY id;');
  sendJson(res, 200, publications);
}

async function createPublication(req, res) {
  try {
    const body = await parseJsonBody(req);
    if (!body.name) {
      sendJson(res, 400, { error: 'name is required' });
      return;
    }
    const now = new Date().toISOString();
    const [publication] = runQuery(
      'INSERT INTO publications (name, website, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p3) RETURNING *;',
      [body.name, body.website || null, body.clientId || null, now],
    );
    sendJson(res, 201, publication);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getPublication(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid publication id' });
    return;
  }
  const [publication] = runQuery('SELECT * FROM publications WHERE id=@p0;', [id]);
  if (!publication) {
    sendJson(res, 404, { error: 'Publication not found' });
    return;
  }
  sendJson(res, 200, publication);
}

async function updatePublication(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid publication id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, ['name', 'website', 'clientId']);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid publication id' });
    return;
  }
  const [publication] = runQuery('DELETE FROM publications WHERE id=@p0 RETURNING *;', [id]);
  if (!publication) {
    sendJson(res, 404, { error: 'Publication not found' });
    return;
  }
  sendJson(res, 200, publication);
}

async function listPressReleases(_req, res) {
  const releases = runQuery('SELECT * FROM pressReleases ORDER BY id;');
  sendJson(res, 200, releases);
}

async function createPressRelease(req, res) {
  try {
    const body = await parseJsonBody(req);
    if (!body.title || !body.releaseDate || !body.clientId) {
      sendJson(res, 400, { error: 'title, releaseDate, and clientId are required' });
      return;
    }
    const now = new Date().toISOString();
    const [pressRelease] = runQuery(
      'INSERT INTO pressReleases (title, content, releaseDate, clientId, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [body.title, body.content || '', body.releaseDate, body.clientId, now],
    );
    sendJson(res, 201, pressRelease);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getPressRelease(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid press release id' });
    return;
  }
  const [pressRelease] = runQuery('SELECT * FROM pressReleases WHERE id=@p0;', [id]);
  if (!pressRelease) {
    sendJson(res, 404, { error: 'Press release not found' });
    return;
  }
  sendJson(res, 200, pressRelease);
}

async function updatePressRelease(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid press release id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, ['title', 'content', 'releaseDate', 'clientId']);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid press release id' });
    return;
  }
  const [pressRelease] = runQuery('DELETE FROM pressReleases WHERE id=@p0 RETURNING *;', [id]);
  if (!pressRelease) {
    sendJson(res, 404, { error: 'Press release not found' });
    return;
  }
  sendJson(res, 200, pressRelease);
}

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
    if (!body.title || !body.mentionDate || !body.clientId || !body.publicationId) {
      sendJson(res, 400, { error: 'title, mentionDate, clientId, and publicationId are required' });
      return;
    }
    const now = new Date().toISOString();
    const [mention] = runQuery(
      `INSERT INTO mediaMentions (title, subjectMatter, mentionDate, reMentionDate, link, source, sentiment, status, clientId, publicationId, pressReleaseId, createdAt, updatedAt)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p11) RETURNING *;`,
      [
        body.title,
        body.subjectMatter || '',
        body.mentionDate,
        body.reMentionDate || null,
        body.link || '',
        body.source || null,
        body.sentiment || null,
        body.status || 'new',
        body.clientId,
        body.publicationId,
        body.pressReleaseId || null,
        now,
      ],
    );
    sendJson(res, 201, mention);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getMediaMention(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid media mention id' });
    return;
  }
  const [mention] = runQuery('SELECT * FROM mediaMentions WHERE id=@p0;', [id]);
  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }
  sendJson(res, 200, mention);
}

async function updateMediaMention(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid media mention id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, [
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
  ]);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid media mention id' });
    return;
  }
  const [mention] = runQuery('DELETE FROM mediaMentions WHERE id=@p0 RETURNING *;', [id]);
  if (!mention) {
    sendJson(res, 404, { error: 'Media mention not found' });
    return;
  }
  sendJson(res, 200, mention);
}

async function listFeedbackSummaries(_req, res) {
  const summaries = runQuery('SELECT * FROM feedbackSummaries ORDER BY id;');
  sendJson(res, 200, summaries);
}

async function createFeedbackSummary(req, res) {
  try {
    const body = await parseJsonBody(req);
    if (!body.clientId || !body.summary) {
      sendJson(res, 400, { error: 'clientId and summary are required' });
      return;
    }
    const now = new Date().toISOString();
    const [summary] = runQuery(
      'INSERT INTO feedbackSummaries (clientId, summary, rating, period, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p4) RETURNING *;',
      [body.clientId, body.summary, body.rating || null, body.period || null, now],
    );
    sendJson(res, 201, summary);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getFeedbackSummary(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid feedback summary id' });
    return;
  }
  const [summary] = runQuery('SELECT * FROM feedbackSummaries WHERE id=@p0;', [id]);
  if (!summary) {
    sendJson(res, 404, { error: 'Feedback summary not found' });
    return;
  }
  sendJson(res, 200, summary);
}

async function updateFeedbackSummary(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid feedback summary id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, ['clientId', 'summary', 'rating', 'period']);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid feedback summary id' });
    return;
  }
  const [summary] = runQuery('DELETE FROM feedbackSummaries WHERE id=@p0 RETURNING *;', [id]);
  if (!summary) {
    sendJson(res, 404, { error: 'Feedback summary not found' });
    return;
  }
  sendJson(res, 200, summary);
}

async function listSearchJobs(_req, res) {
  const jobs = runQuery('SELECT * FROM searchJobs ORDER BY id;');
  sendJson(res, 200, jobs);
}

async function createSearchJob(req, res) {
  try {
    const body = await parseJsonBody(req);
    if (!body.clientId || !body.query || !body.scheduledAt) {
      sendJson(res, 400, { error: 'clientId, query, and scheduledAt are required' });
      return;
    }
    const now = new Date().toISOString();
    const [job] = runQuery(
      'INSERT INTO searchJobs (clientId, query, status, scheduledAt, completedAt, createdAt, updatedAt) VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p5) RETURNING *;',
      [body.clientId, body.query, body.status || 'pending', body.scheduledAt, body.completedAt || null, now],
    );
    sendJson(res, 201, job);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function getSearchJob(_req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid search job id' });
    return;
  }
  const [job] = runQuery('SELECT * FROM searchJobs WHERE id=@p0;', [id]);
  if (!job) {
    sendJson(res, 404, { error: 'Search job not found' });
    return;
  }
  sendJson(res, 200, job);
}

async function updateSearchJob(req, res, params) {
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid search job id' });
    return;
  }
  const body = await parseJsonBody(req);
  const { keys, values } = buildUpdateFields(body, ['clientId', 'query', 'status', 'scheduledAt', 'completedAt']);
  if (!keys.length) {
    sendJson(res, 400, { error: 'No updatable fields provided' });
    return;
  }
  keys.push('updatedAt');
  values.push(new Date().toISOString());
  values.push(id);
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
  const id = Number(params.id);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid search job id' });
    return;
  }
  const [job] = runQuery('DELETE FROM searchJobs WHERE id=@p0 RETURNING *;', [id]);
  if (!job) {
    sendJson(res, 404, { error: 'Search job not found' });
    return;
  }
  sendJson(res, 200, job);
}

async function exportMentions(_req, res, params) {
  const clientId = Number(params.id);
  if (!clientId) {
    sendJson(res, 400, { error: 'Invalid client id' });
    return;
  }
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
  // Get all unverified mentions (verified = 0)
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

  // Build CSV
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
];

const server = http.createServer(async (req, res) => {
  const corsOrigin = config.server.corsOrigin;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    });
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  const matchedRoute = routes.find((route) => route.method === req.method && matchRoute(route.pattern, req.url.split('?')[0]));
  if (!matchedRoute) {
    sendJson(res, 404, { error: 'Route not found' });
    return;
  }

  // Apply authentication middleware
  // Uses callback pattern since requireApiKey expects (req, res, next)
  const authPassed = await new Promise((resolve) => {
    requireApiKey(req, res, () => resolve(true));
    // If auth fails, requireApiKey sends 401 response and doesn't call next
    // Give it a moment to check - if response was sent, resolve false
    setImmediate(() => {
      if (res.writableEnded) resolve(false);
    });
  });

  if (!authPassed) return;

  const params = matchRoute(matchedRoute.pattern, req.url.split('?')[0]);
  try {
    await matchedRoute.handler(req, res, params || {});
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);

  // Initialize WebSocket server for real-time updates
  initWebSocket(server);
});
