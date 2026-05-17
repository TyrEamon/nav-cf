CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order");

CREATE TABLE IF NOT EXISTS sub_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order");

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER,
  sub_menu_id INTEGER,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  custom_logo_path TEXT,
  desc TEXT,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY(sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id);
CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id);
CREATE INDEX IF NOT EXISTS idx_cards_order ON cards("order");

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  last_login_time TEXT,
  last_login_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position TEXT NOT NULL,
  img TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);

CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT
);

CREATE INDEX IF NOT EXISTS idx_friends_title ON friends(title);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('site_name', 'Nav-Item'),
  ('site_logo_url', 'https://img.icons8.com/lollipop/100/navigation.png'),
  ('background_url', 'https://link.tyrlink.dpdns.org/nav.webp'),
  ('umami_base_url', 'https://u.mtcacg.top'),
  ('umami_website_id', 'c16beeaa-1801-4337-9d35-3aa2ea8b300a'),
  ('umami_share_url', 'https://u.mtcacg.top/share/9WknxPqM6gjT0j4w');
