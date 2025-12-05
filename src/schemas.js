/**
 * @fileoverview Zod validation schemas for API endpoints
 */

const { z } = require('zod');

// Common refinements
const positiveInt = z.coerce.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Invalid date format');
const email = z.string().email();
const url = z.string().url().optional().or(z.literal(''));

// Client schemas
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: email
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: email.optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Publication schemas
const createPublicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().optional().nullable(),
  clientId: positiveInt.optional().nullable()
});

const updatePublicationSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().optional().nullable(),
  clientId: positiveInt.optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Press Release schemas
const createPressReleaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional().default(''),
  releaseDate: isoDate,
  clientId: positiveInt
});

const updatePressReleaseSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  releaseDate: isoDate.optional(),
  clientId: positiveInt.optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Media Mention schemas
const sentimentEnum = z.enum(['positive', 'negative', 'neutral']).optional().nullable();
const statusEnum = z.enum(['new', 'pending', 'reviewed', 'archived']).optional().nullable();

const createMediaMentionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subjectMatter: z.string().optional().default(''),
  mentionDate: isoDate,
  reMentionDate: isoDate.optional().nullable(),
  link: z.string().optional().default(''),
  source: z.string().optional().nullable(),
  sentiment: sentimentEnum,
  status: statusEnum.default('new'),
  clientId: positiveInt,
  publicationId: positiveInt,
  pressReleaseId: positiveInt.optional().nullable()
});

const updateMediaMentionSchema = z.object({
  title: z.string().min(1).optional(),
  subjectMatter: z.string().optional(),
  mentionDate: isoDate.optional(),
  reMentionDate: isoDate.optional().nullable(),
  link: z.string().optional(),
  source: z.string().optional().nullable(),
  sentiment: sentimentEnum,
  status: statusEnum,
  clientId: positiveInt.optional(),
  publicationId: positiveInt.optional(),
  pressReleaseId: positiveInt.optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Media Mentions list query params
const listMediaMentionsSchema = z.object({
  clientId: positiveInt.optional(),
  publicationId: positiveInt.optional(),
  pressReleaseId: positiveInt.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  subject: z.string().optional()
});

// Feedback Summary schemas
const createFeedbackSummarySchema = z.object({
  clientId: positiveInt,
  summary: z.string().min(1, 'Summary is required'),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  period: z.string().optional().nullable()
});

const updateFeedbackSummarySchema = z.object({
  clientId: positiveInt.optional(),
  summary: z.string().min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  period: z.string().optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Search Job schemas
const searchJobStatusEnum = z.enum(['pending', 'running', 'completed', 'failed']).optional().default('pending');

const createSearchJobSchema = z.object({
  clientId: positiveInt,
  query: z.string().min(1, 'Query is required'),
  status: searchJobStatusEnum,
  scheduledAt: isoDate,
  completedAt: isoDate.optional().nullable()
});

const updateSearchJobSchema = z.object({
  clientId: positiveInt.optional(),
  query: z.string().min(1).optional(),
  status: searchJobStatusEnum,
  scheduledAt: isoDate.optional(),
  completedAt: isoDate.optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// URL param schemas
const idParamSchema = z.object({
  id: positiveInt
});

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {Object} data - Data to validate
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: errors };
}

module.exports = {
  // Client
  createClientSchema,
  updateClientSchema,
  // Publication
  createPublicationSchema,
  updatePublicationSchema,
  // Press Release
  createPressReleaseSchema,
  updatePressReleaseSchema,
  // Media Mention
  createMediaMentionSchema,
  updateMediaMentionSchema,
  listMediaMentionsSchema,
  // Feedback Summary
  createFeedbackSummarySchema,
  updateFeedbackSummarySchema,
  // Search Job
  createSearchJobSchema,
  updateSearchJobSchema,
  // Params
  idParamSchema,
  // Helper
  validate
};
