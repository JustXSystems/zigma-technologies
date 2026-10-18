/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} FindingSeverity */
/** @typedef {'dev' | 'marketing' | 'ops'} FindingOwner */
/** @typedef {'ok' | 'auth_required' | 'error' | 'skipped' | 'degraded'} ConnectorStatusCode */

/**
 * @typedef {object} MeridianFinding
 * @property {string} code
 * @property {FindingSeverity} severity
 * @property {string} title
 * @property {string} detail
 * @property {string} [evidence]
 * @property {string} remediation
 * @property {FindingOwner} owner
 * @property {string} [pillar]
 */

/**
 * @typedef {object} PageFact
 * @property {string} path
 * @property {number} status
 * @property {string} title
 * @property {string} canonical
 * @property {string} robots
 * @property {number} h1
 * @property {string} [ogImage]
 * @property {string[]} schemaTypes
 * @property {string[]} issues
 */

/**
 * @typedef {object} ConnectorResult
 * @property {string} id
 * @property {string} label
 * @property {ConnectorStatusCode} status
 * @property {string} [message]
 * @property {Record<string, unknown>} [data]
 */

/**
 * @typedef {object} MeridianReport
 * @property {object} meta
 * @property {object} scorecard
 * @property {MeridianFinding[]} findings
 * @property {PageFact[]} pages
 * @property {ConnectorResult[]} connectors
 * @property {object} signals
 * @property {object[]} roadmap
 * @property {object} profile
 */

export {};
