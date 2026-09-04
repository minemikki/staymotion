// StayMotion MCP — token embedded in the URL path: /api/mcp/<token>
// This is the reliable form for claude.ai custom connectors: the token rides
// on EVERY request (including Claude's connection check), so Claude never sees
// a 401 and the "None" auth option works. Set Authentication = None, no headers.
import { serveMcp } from '../../lib/mcp-core.js';

export default async function handler(req, res) {
  const token = (req.query && req.query.key) || '';
  return serveMcp(req, res, token);
}
