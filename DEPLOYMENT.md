# Deployment (1 VPS: Next.js App + PostgreSQL)

Dokumen ini menjelaskan baseline deployment untuk **1 VPS** yang menjalankan:

- **Next.js app** (Node runtime) sebagai web server
- **PostgreSQL** (self-hosted) sebagai database
- **ImageKit** untuk storage & delivery gambar

> Catatan: langkah di bawah ditulis generik untuk Ubuntu 22.04/24.04. Sesuaikan bila distro berbeda.

## 0) Checklist keputusan

- Domain yang dipakai: `app.example.com`
- Port internal app: `3000` (hanya lokal)
- Postgres tidak dibuka ke publik (akses hanya dari app / docker network)
- Reverse proxy + SSL: `nginx` + `certbot` (atau Caddy jika prefer)

## Option A (Recommended): Docker Compose

Setup ini cocok jika kamu ingin deployment repeatable dan bisa membatasi resource DB (CPU/RAM) via container.

### 1) Hardening server (minimal)

- Buat user non-root, pakai SSH key, nonaktifkan password login (opsional tapi disarankan).
- Update package:

```bash
sudo apt update && sudo apt -y upgrade
```

- Firewall (contoh UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2) Install Docker + Nginx

Install Docker Engine + Compose plugin (sesuaikan dengan distro). Untuk Ubuntu (simple path):

```bash
sudo apt -y install docker.io docker-compose-plugin nginx
sudo systemctl enable --now docker
```

Tambahkan user ke group docker (opsional):

```bash
sudo usermod -aG docker $USER
```

Logout/login ulang agar group aktif.

### 3) Deploy app + DB

Clone repo:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone <YOUR_REPO_URL> /var/www/stocking-app
cd /var/www/stocking-app
```

Siapkan env untuk docker compose:

```bash
cp .env.example .env
nano .env
```

Wajib set untuk auth:

- `AUTH_URL`:
  - local: `http://localhost:3000`
  - production: `https://app.example.com`
- `AUTH_SECRET`: random secret (contoh generate: `openssl rand -base64 32`)

Jalankan container (gunakan `--compatibility` agar resource limit di `docker-compose.yml` diterapkan):

```bash
docker compose --compatibility up -d --build
```

Cek status/log:

```bash
docker compose ps
docker compose logs -f app
```

Update versi aplikasi:

```bash
cd /var/www/stocking-app
git pull
docker compose --compatibility up -d --build
```

### 4) Nginx reverse proxy + SSL

Buat config Nginx:

```bash
sudo nano /etc/nginx/sites-available/stocking-app
```

Contoh:

```nginx
server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/stocking-app /etc/nginx/sites-enabled/stocking-app
sudo nginx -t
sudo systemctl reload nginx
```

SSL (Certbot):

```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com
```

### 5) Backup (wajib)

Volume docker (`postgres_data`) bukan pengganti backup. Minimal: `pg_dump` harian ke folder backup + sync ke storage eksternal.

Contoh manual (jalan dari folder repo yang berisi `.env`):

```bash
cd /var/www/stocking-app
set -a; source .env; set +a

mkdir -p /var/backups/stocking-app
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "/var/backups/stocking-app/stocking_app_$(date +%F).sql.gz"
```

**Wajib**: pernah uji restore di environment terpisah.

### 6) Monitoring (minimal)

- Alert disk hampir penuh (log + backup bisa membengkak).
- Pantau load CPU/RAM, dan query lambat di Postgres.
- Cek health service via `docker compose ps` dan logs via `docker compose logs`.

## Option B: Non-Docker (systemd)

Pilihan ini lebih sederhana (tanpa container), namun resource limiting DB dilakukan lewat konfigurasi Postgres/systemd/cgroups.

### 1) Hardening server (minimal)

- Buat user non-root, pakai SSH key, nonaktifkan password login (opsional tapi disarankan).
- Update package:

```bash
sudo apt update && sudo apt -y upgrade
```

- Firewall (contoh UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2) Install runtime & dependencies

### Node.js

Install Node.js 20+ (metode bebas: nvm / NodeSource / package repo).

### Bun (opsional)

Repo ini memakai `bun.lockb`. Jika mau konsisten, install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

Pastikan `bun --version` terdeteksi untuk user yang menjalankan service.

### PostgreSQL + Nginx

```bash
sudo apt -y install postgresql postgresql-contrib nginx
```

### 3) Setup PostgreSQL (local-only)

Masuk ke psql:

```bash
sudo -u postgres psql
```

Contoh setup DB + user (ganti password):

```sql
CREATE DATABASE stocking_app;
CREATE USER stocking_app_user WITH ENCRYPTED PASSWORD 'CHANGE_ME';
GRANT ALL PRIVILEGES ON DATABASE stocking_app TO stocking_app_user;
```

Pastikan Postgres hanya listen local:

- `listen_addresses = 'localhost'` di `postgresql.conf`
- `pg_hba.conf` hanya mengizinkan koneksi lokal sesuai kebutuhan

Restart:

```bash
sudo systemctl restart postgresql
```

### 4) Deploy app

Contoh lokasi:

```bash
sudo mkdir -p /var/www/stocking-app
sudo chown -R $USER:$USER /var/www/stocking-app
```

Clone & install:

```bash
git clone <YOUR_REPO_URL> /var/www/stocking-app
cd /var/www/stocking-app
bun install
```

Buat file env production (contoh sederhana):

```bash
sudo mkdir -p /etc/stocking-app
sudo nano /etc/stocking-app/env
```

Contoh isi `/etc/stocking-app/env`:

```bash
NODE_ENV=production
PORT=3000

DATABASE_URL=postgres://stocking_app_user:CHANGE_ME@localhost:5432/stocking_app

AUTH_URL=https://app.example.com
AUTH_SECRET=CHANGE_ME
AUTH_TRUST_HOST=true

IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/xxx
```

Build:

```bash
cd /var/www/stocking-app
bun run build
```

### 5) Jalankan app dengan systemd

Buat unit:

```bash
sudo nano /etc/systemd/system/stocking-app.service
```

Contoh unit (sesuaikan user/path):

```ini
[Unit]
Description=Stocking App (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/stocking-app
EnvironmentFile=/etc/stocking-app/env
ExecStart=/usr/bin/env bun run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now stocking-app
sudo systemctl status stocking-app --no-pager
```

Logs:

```bash
journalctl -u stocking-app -f
```

### 6) Nginx reverse proxy + SSL

Buat config Nginx:

```bash
sudo nano /etc/nginx/sites-available/stocking-app
```

Contoh:

```nginx
server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/stocking-app /etc/nginx/sites-enabled/stocking-app
sudo nginx -t
sudo systemctl reload nginx
```

SSL (Certbot):

```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com
```

### 7) Backup (wajib)

Minimal: `pg_dump` harian ke folder backup + sync ke storage eksternal (object storage/drive lain).

Contoh manual:

```bash
pg_dump "$DATABASE_URL" | gzip > /var/backups/stocking_app_$(date +%F).sql.gz
```

**Wajib**: pernah uji restore di environment terpisah.

### 8) Monitoring (minimal)

- Alert disk hampir penuh (log + backup bisa membengkak).
- Pantau load CPU/RAM, dan query lambat di Postgres.
- Pastikan `stocking-app` service auto-restart dan gampang di-debug via `journalctl`.
