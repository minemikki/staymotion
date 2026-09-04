// StayMotion MCP — token via Authorization header or ?key=.
// (For the easiest claude.ai setup, use the path form: /api/mcp/<token>.)
import { serveMcp } from '../lib/mcp-core.js';

export default async function handler(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || '';
  return serveMcp(req, res, token);
}
