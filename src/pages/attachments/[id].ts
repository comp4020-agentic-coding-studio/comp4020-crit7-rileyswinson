import type { APIRoute } from "astro";
import { getAttachment, getRequest } from "../../lib/db";
import { canView, getSession } from "../../lib/session";

// Same rule as the request page: an ECA's documents are for the student and
// CENTRAL only. Always served as a download, never rendered inline.
export const GET: APIRoute = ({ params, cookies }) => {
  const file = getAttachment(Number(params.id));
  const request = file && getRequest(file.requestId);
  if (!file || !request || !canView(getSession(cookies), request)) {
    return new Response("Not found", { status: 404 });
  }
  const name = file.filename.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
};
