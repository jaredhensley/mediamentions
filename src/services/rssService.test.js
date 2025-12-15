const { parseRssXml } = require('./rssService');

describe('rssService', () => {
  describe('parseRssXml', () => {
    test('parses basic Google Alerts RSS feed', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Google Alert - test</title>
            <item>
              <title>Test Article Title</title>
              <link>https://www.google.com/url?rct=j&amp;sa=t&amp;url=https://example.com/article</link>
              <pubDate>Sat, 14 Dec 2024 10:00:00 GMT</pubDate>
              <description>This is a test description for the article.</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Test Article Title');
      expect(items[0].link).toBe('https://example.com/article');
      expect(items[0].pubDate).toBe('Sat, 14 Dec 2024 10:00:00 GMT');
      expect(items[0].description).toBe('This is a test description for the article.');
    });

    test('parses multiple items', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article 1</title>
              <link>https://example1.com</link>
              <pubDate>Sat, 14 Dec 2024 10:00:00 GMT</pubDate>
              <description>Description 1</description>
            </item>
            <item>
              <title>Article 2</title>
              <link>https://example2.com</link>
              <pubDate>Sat, 14 Dec 2024 11:00:00 GMT</pubDate>
              <description>Description 2</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('Article 1');
      expect(items[1].title).toBe('Article 2');
    });

    test('handles CDATA sections', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[Article with special characters & entities]]></title>
              <link>https://example.com</link>
              <description><![CDATA[<b>Bold</b> text with &amp; and <a href="#">links</a>]]></description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      // HTML tags get stripped, & in CDATA is literal &
      expect(items[0].title).toBe('Article with special characters & entities');
      // HTML tags should be stripped from description, &amp; decodes to &
      expect(items[0].description).toBe('Bold text with & and links');
    });

    test('decodes HTML entities', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Article &amp; Title with &quot;quotes&quot;</title>
              <link>https://example.com</link>
              <description>Description with special chars &amp; &apos;apostrophes&apos;</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Article & Title with "quotes"');
      expect(items[0].description).toBe("Description with special chars & 'apostrophes'");
    });

    test('extracts actual URL from Google redirect URLs', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Test</title>
              <link>https://www.google.com/url?rct=j&amp;sa=t&amp;url=https%3A%2F%2Factual-site.com%2Farticle%3Fid%3D123&amp;ct=ga</link>
              <description>Test</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      expect(items[0].link).toBe('https://actual-site.com/article?id=123');
    });

    test('handles empty feed', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);
      expect(items).toHaveLength(0);
    });

    test('skips items without links', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>No Link Article</title>
              <description>This has no link</description>
            </item>
            <item>
              <title>Has Link</title>
              <link>https://example.com</link>
              <description>This has a link</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Has Link');
    });

    test('provides default title for items without title', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <link>https://example.com</link>
              <description>Article without title</description>
            </item>
          </channel>
        </rss>`;

      const items = parseRssXml(xml);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Untitled');
    });
  });
});
