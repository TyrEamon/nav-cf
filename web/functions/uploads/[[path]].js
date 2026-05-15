export async function onRequestGet({ env, params }) {
  if (!env.UPLOADS) {
    return new Response("Not found", { status: 404 });
  }

  const key = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.UPLOADS.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
