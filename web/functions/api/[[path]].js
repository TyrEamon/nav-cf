import bcrypt from "bcryptjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const tokenTtlSeconds = 60 * 60 * 2;
const fallbackJwtSecret = "your_jwt_secret_key";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const segments = path.split("/").filter(Boolean).map(decodeURIComponent);

    if (segments.length === 0) {
      return json({ ok: true });
    }

    if (segments[0] === "login" && request.method === "POST") {
      return handleLogin(request, env);
    }

    if (segments[0] === "menus") {
      return handleMenus(request, env, url, segments);
    }

    if (segments[0] === "cards") {
      return handleCards(request, env, url, segments);
    }

    if (segments[0] === "upload") {
      return handleUpload(request, env);
    }

    if (segments[0] === "ads") {
      return handleAds(request, env, url, segments);
    }

    if (segments[0] === "friends") {
      return handleFriends(request, env, url, segments);
    }

    if (segments[0] === "users") {
      return handleUsers(request, env, url, segments);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof ResponseError) {
      return json({ error: error.message }, error.status);
    }

    console.error(error);
    return json({ error: "Internal server error" }, 500);
  }
}

async function handleLogin(request, env) {
  const { username, password } = await readJson(request);
  if (!username || !password) {
    return json({ error: "Username and password are required" }, 400);
  }

  const user = await first(env, "SELECT * FROM users WHERE username=?", [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return json({ error: "Invalid username or password" }, 401);
  }

  const lastLoginTime = user.last_login_time || "";
  const lastLoginIp = user.last_login_ip || "";
  const now = getShanghaiTime();
  const ip = getClientIp(request);

  await run(env, "UPDATE users SET last_login_time=?, last_login_ip=? WHERE id=?", [
    now,
    ip,
    user.id,
  ]);

  const token = await signJwt(
    { id: user.id, username: user.username },
    getJwtSecret(env),
    tokenTtlSeconds,
  );

  return json({ token, lastLoginTime, lastLoginIp });
}

async function handleMenus(request, env, url, segments) {
  if (segments.length === 1 && request.method === "GET") {
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");

    if (!page && !pageSize) {
      const menus = await all(env, 'SELECT * FROM menus ORDER BY "order"');
      const menusWithSubMenus = await Promise.all(
        menus.map(async (menu) => ({
          ...menu,
          subMenus: await all(
            env,
            'SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"',
            [menu.id],
          ),
        })),
      );

      return json(menusWithSubMenus);
    }

    const pageNum = positiveInt(page, 1);
    const size = positiveInt(pageSize, 10);
    const offset = (pageNum - 1) * size;
    const countRow = await first(env, "SELECT COUNT(*) as total FROM menus");
    const rows = await all(env, 'SELECT * FROM menus ORDER BY "order" LIMIT ? OFFSET ?', [
      size,
      offset,
    ]);

    return json({
      total: countRow?.total || 0,
      page: pageNum,
      pageSize: size,
      data: rows,
    });
  }

  if (segments.length === 3 && segments[1] === "submenus") {
    await requireUser(request, env);
    const id = segments[2];

    if (request.method === "PUT") {
      const { name, order } = await readJson(request);
      const meta = await run(env, 'UPDATE sub_menus SET name=?, "order"=? WHERE id=?', [
        name,
        order || 0,
        id,
      ]);
      return json({ changed: meta.changes || 0 });
    }

    if (request.method === "DELETE") {
      const meta = await run(env, "DELETE FROM sub_menus WHERE id=?", [id]);
      return json({ deleted: meta.changes || 0 });
    }
  }

  if (segments.length === 3 && segments[2] === "submenus") {
    const parentId = segments[1];

    if (request.method === "GET") {
      const rows = await all(env, 'SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [
        parentId,
      ]);
      return json(rows);
    }

    if (request.method === "POST") {
      await requireUser(request, env);
      const { name, order } = await readJson(request);
      const meta = await run(
        env,
        'INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)',
        [parentId, name, order || 0],
      );
      return json({ id: meta.last_row_id });
    }
  }

  if (segments.length === 1 && request.method === "POST") {
    await requireUser(request, env);
    const { name, order } = await readJson(request);
    const meta = await run(env, 'INSERT INTO menus (name, "order") VALUES (?, ?)', [
      name,
      order || 0,
    ]);
    return json({ id: meta.last_row_id });
  }

  if (segments.length === 2) {
    await requireUser(request, env);
    const id = segments[1];

    if (request.method === "PUT") {
      const { name, order } = await readJson(request);
      const meta = await run(env, 'UPDATE menus SET name=?, "order"=? WHERE id=?', [
        name,
        order || 0,
        id,
      ]);
      return json({ changed: meta.changes || 0 });
    }

    if (request.method === "DELETE") {
      const meta = await run(env, "DELETE FROM menus WHERE id=?", [id]);
      return json({ deleted: meta.changes || 0 });
    }
  }

  return methodNotAllowed();
}

async function handleCards(request, env, url, segments) {
  if (segments.length === 2 && request.method === "GET") {
    const menuId = segments[1];
    const subMenuId = url.searchParams.get("subMenuId");
    const rows = subMenuId
      ? await all(env, 'SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"', [subMenuId])
      : await all(
          env,
          'SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"',
          [menuId],
        );

    return json(rows.map(withDisplayLogo));
  }

  if (segments.length === 1 && request.method === "POST") {
    await requireUser(request, env);
    const body = await readJson(request);
    const meta = await run(
      env,
      'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        body.menu_id,
        body.sub_menu_id || null,
        body.title,
        body.url,
        body.logo_url || "",
        body.custom_logo_path || null,
        body.desc || "",
        body.order || 0,
      ],
    );
    return json({ id: meta.last_row_id });
  }

  if (segments.length === 2) {
    await requireUser(request, env);
    const id = segments[1];

    if (request.method === "PUT") {
      const body = await readJson(request);
      const meta = await run(
        env,
        'UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?',
        [
          body.menu_id,
          body.sub_menu_id || null,
          body.title,
          body.url,
          body.logo_url || "",
          body.custom_logo_path || null,
          body.desc || "",
          body.order || 0,
          id,
        ],
      );
      return json({ changed: meta.changes || 0 });
    }

    if (request.method === "DELETE") {
      const meta = await run(env, "DELETE FROM cards WHERE id=?", [id]);
      return json({ deleted: meta.changes || 0 });
    }
  }

  return methodNotAllowed();
}

async function handleUpload(request, env) {
  await requireUser(request, env);

  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  if (!env.UPLOADS) {
    throw new ResponseError("UPLOADS R2 binding is missing", 500);
  }

  const formData = await request.formData();
  const file = formData.get("logo");
  if (!file || typeof file === "string") {
    return json({ error: "No file uploaded" }, 400);
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file.name)}`;
  await env.UPLOADS.put(filename, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  return json({ filename, url: `/uploads/${filename}` });
}

async function handleAds(request, env, url, segments) {
  if (segments.length === 1 && request.method === "GET") {
    return paginatedList(env, url, "ads", "SELECT * FROM ads", "SELECT COUNT(*) as total FROM ads");
  }

  if (segments.length === 1 && request.method === "POST") {
    await requireUser(request, env);
    const { position, img, url: targetUrl } = await readJson(request);
    const meta = await run(env, "INSERT INTO ads (position, img, url) VALUES (?, ?, ?)", [
      position,
      img,
      targetUrl,
    ]);
    return json({ id: meta.last_row_id });
  }

  if (segments.length === 2) {
    await requireUser(request, env);
    const id = segments[1];

    if (request.method === "PUT") {
      const { img, url: targetUrl } = await readJson(request);
      const meta = await run(env, "UPDATE ads SET img=?, url=? WHERE id=?", [img, targetUrl, id]);
      return json({ changed: meta.changes || 0 });
    }

    if (request.method === "DELETE") {
      const meta = await run(env, "DELETE FROM ads WHERE id=?", [id]);
      return json({ deleted: meta.changes || 0 });
    }
  }

  return methodNotAllowed();
}

async function handleFriends(request, env, url, segments) {
  if (segments.length === 1 && request.method === "GET") {
    return paginatedList(
      env,
      url,
      "friends",
      "SELECT * FROM friends",
      "SELECT COUNT(*) as total FROM friends",
    );
  }

  if (segments.length === 1 && request.method === "POST") {
    await requireUser(request, env);
    const { title, url: targetUrl, logo } = await readJson(request);
    const meta = await run(env, "INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)", [
      title,
      targetUrl,
      logo || "",
    ]);
    return json({ id: meta.last_row_id });
  }

  if (segments.length === 2) {
    await requireUser(request, env);
    const id = segments[1];

    if (request.method === "PUT") {
      const { title, url: targetUrl, logo } = await readJson(request);
      const meta = await run(env, "UPDATE friends SET title=?, url=?, logo=? WHERE id=?", [
        title,
        targetUrl,
        logo || "",
        id,
      ]);
      return json({ changed: meta.changes || 0 });
    }

    if (request.method === "DELETE") {
      const meta = await run(env, "DELETE FROM friends WHERE id=?", [id]);
      return json({ deleted: meta.changes || 0 });
    }
  }

  return methodNotAllowed();
}

async function handleUsers(request, env, url, segments) {
  const user = await requireUser(request, env);

  if (segments.length === 2 && segments[1] === "profile" && request.method === "GET") {
    const row = await first(env, "SELECT id, username FROM users WHERE id = ?", [user.id]);
    if (!row) {
      return json({ message: "User not found" }, 404);
    }
    return json({ data: row });
  }

  if (segments.length === 2 && segments[1] === "me" && request.method === "GET") {
    const row = await first(
      env,
      "SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = ?",
      [user.id],
    );
    if (!row) {
      return json({ message: "User not found" }, 404);
    }
    return json({
      last_login_time: row.last_login_time || "",
      last_login_ip: row.last_login_ip || "",
    });
  }

  if (segments.length === 2 && segments[1] === "password" && request.method === "PUT") {
    const { oldPassword, newPassword } = await readJson(request);
    if (!oldPassword || !newPassword) {
      return json({ message: "Old password and new password are required" }, 400);
    }
    if (newPassword.length < 6) {
      return json({ message: "New password must be at least 6 characters" }, 400);
    }

    const row = await first(env, "SELECT password FROM users WHERE id = ?", [user.id]);
    if (!row) {
      return json({ message: "User not found" }, 404);
    }
    if (!bcrypt.compareSync(oldPassword, row.password)) {
      return json({ message: "Old password is incorrect" }, 400);
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await run(env, "UPDATE users SET password = ? WHERE id = ?", [newPasswordHash, user.id]);
    return json({ message: "Password updated" });
  }

  if (segments.length === 1 && request.method === "GET") {
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");

    if (!page && !pageSize) {
      const users = await all(env, "SELECT id, username FROM users");
      return json({ data: users });
    }

    const pageNum = positiveInt(page, 1);
    const size = positiveInt(pageSize, 10);
    const offset = (pageNum - 1) * size;
    const countRow = await first(env, "SELECT COUNT(*) as total FROM users");
    const users = await all(env, "SELECT id, username FROM users LIMIT ? OFFSET ?", [size, offset]);
    return json({
      total: countRow?.total || 0,
      page: pageNum,
      pageSize: size,
      data: users,
    });
  }

  return methodNotAllowed();
}

async function paginatedList(env, url, table, selectSql, countSql) {
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");

  if (!page && !pageSize) {
    return json(await all(env, selectSql));
  }

  const pageNum = positiveInt(page, 1);
  const size = positiveInt(pageSize, 10);
  const offset = (pageNum - 1) * size;
  const countRow = await first(env, countSql);
  const rows = await all(env, `${selectSql} LIMIT ? OFFSET ?`, [size, offset]);

  return json({
    total: countRow?.total || 0,
    page: pageNum,
    pageSize: size,
    data: rows,
  });
}

function withDisplayLogo(card) {
  if (card.custom_logo_path) {
    return { ...card, display_logo: `/uploads/${card.custom_logo_path}` };
  }

  const fallbackLogo = (() => {
    try {
      return `${new URL(card.url).origin}/favicon.ico`;
    } catch {
      return "/default-favicon.png";
    }
  })();

  return { ...card, display_logo: card.logo_url || fallbackLogo };
}

async function all(env, sql, params = []) {
  ensureDb(env);
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results || [];
}

async function first(env, sql, params = []) {
  ensureDb(env);
  return env.DB.prepare(sql).bind(...params).first();
}

async function run(env, sql, params = []) {
  ensureDb(env);
  const result = await env.DB.prepare(sql).bind(...params).run();
  return result.meta || {};
}

function ensureDb(env) {
  if (!env.DB) {
    throw new ResponseError("DB binding is missing", 500);
  }
}

async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireUser(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    throw new ResponseError("Unauthorized", 401);
  }

  return verifyJwt(auth.slice(7), getJwtSecret(env));
}

function getJwtSecret(env) {
  return env.JWT_SECRET || fallbackJwtSecret;
}

async function signJwt(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const signature = await hmacSha256(`${header}.${body}`, secret);
  return `${header}.${body}.${base64urlEncode(signature)}`;
}

async function verifyJwt(token, secret) {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new ResponseError("Invalid token", 401);
  }

  const expected = base64urlEncode(await hmacSha256(`${header}.${body}`, secret));
  if (!constantTimeEqual(signature, expected)) {
    throw new ResponseError("Invalid token", 401);
  }

  const payload = JSON.parse(decoder.decode(base64urlDecode(body)));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new ResponseError("Token expired", 401);
  }

  return payload;
}

async function hmacSha256(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function base64urlEncode(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(value) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

function getShanghaiTime() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

function safeExtension(filename = "") {
  const match = filename.match(/\.([a-z0-9]{1,12})$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function positiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function methodNotAllowed() {
  return json({ error: "Method not allowed" }, 405);
}

class ResponseError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
