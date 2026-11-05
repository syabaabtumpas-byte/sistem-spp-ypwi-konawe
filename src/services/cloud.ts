/**
 * Sinkronisasi data SPP ke database bersama (Supabase) — opsional.
 *
 * Aplikasi tetap berjalan penuh tanpa konfigurasi apa pun (mode LOKAL,
 * data di localStorage). Mode CLOUD aktif bila VITE_SUPABASE_URL dan
 * VITE_SUPABASE_ANON_KEY diisi lewat berkas .env.
 *
 * Komunikasi memakai REST Supabase langsung lewat fetch, tanpa dependensi
 * tambahan. Keamanan data dijaga Row Level Security (lihat supabase/schema.sql).
 */

const SESSION_STORAGE_KEY = 'ypwi_cloud_session_v1';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
}

export interface CloudStateRow {
  payload: unknown;
  updatedAt: string;
}

export type CloudSnapshot = Record<string, CloudStateRow>;

/** Kelompok data yang ikut disinkronkan. Sama dengan berkas cadangan JSON. */
export const CLOUD_DATA_KEYS = ['students', 'payments', 'settings', 'waLogs', 'users'] as const;
export type CloudDataKey = (typeof CLOUD_DATA_KEYS)[number];

export class CloudError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'CloudError';
    this.status = status;
  }
}

export function getCloudConfig(): CloudConfig | null {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

export function isCloudEnabled(): boolean {
  return getCloudConfig() !== null;
}

interface SessionStore {
  get(): CloudSession | null;
  set(session: CloudSession | null): void;
}

const browserSessionStore: SessionStore = {
  get() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CloudSession) : null;
    } catch {
      return null;
    }
  },
  set(session) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* penyimpanan penuh / diblokir — sesi tetap hidup di memori */
    }
  },
};

export interface CloudClientOptions {
  fetchImpl?: typeof fetch;
  sessionStore?: SessionStore;
}

export class CloudClient {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sessionStore: SessionStore;
  private session: CloudSession | null;

  constructor(config: CloudConfig, options: CloudClientOptions = {}) {
    this.url = config.url;
    this.anonKey = config.anonKey;
    this.fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (null as unknown as typeof fetch));
    this.sessionStore = options.sessionStore ?? browserSessionStore;
    this.session = this.sessionStore.get();
  }

  get currentSession(): CloudSession | null {
    return this.session;
  }

  hasSession(): boolean {
    return this.session !== null;
  }

  private headers(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.anonKey,
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const message = body.error_description ?? body.msg ?? body.message ?? body.error;
      if (typeof message === 'string' && message.trim()) return message;
    } catch {
      /* body bukan JSON */
    }
    return `HTTP ${response.status}`;
  }

  async signIn(email: string, password: string): Promise<CloudSession> {
    const response = await this.fetchImpl(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new CloudError(await this.errorMessage(response), response.status);
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      user?: { id?: string; email?: string };
    };
    const session: CloudSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      userId: data.user?.id ?? '',
      email: data.user?.email ?? email,
    };
    this.session = session;
    this.sessionStore.set(session);
    return session;
  }

  async signOut(): Promise<void> {
    const session = this.session;
    if (session?.accessToken) {
      try {
        await this.fetchImpl(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: this.headers(session.accessToken),
        });
      } catch {
        /* sesi lokal tetap dihapus walaupun server tidak terjangkau */
      }
    }
    this.session = null;
    this.sessionStore.set(null);
  }

  private async refreshSession(): Promise<CloudSession> {
    const current = this.session;
    if (!current?.refreshToken) throw new CloudError('Sesi cloud sudah berakhir. Silakan login ulang.', 401);

    const response = await this.fetchImpl(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });
    if (!response.ok) {
      this.session = null;
      this.sessionStore.set(null);
      throw new CloudError('Sesi cloud sudah berakhir. Silakan login ulang.', 401);
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      user?: { id?: string; email?: string };
    };
    const session: CloudSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? current.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      userId: data.user?.id ?? current.userId,
      email: data.user?.email ?? current.email,
    };
    this.session = session;
    this.sessionStore.set(session);
    return session;
  }

  private async validSession(): Promise<CloudSession> {
    if (!this.session) throw new CloudError('Belum login ke cloud.', 401);
    if (Date.now() < this.session.expiresAt - 30_000) return this.session;
    return this.refreshSession();
  }

  private async authed(path: string, init: RequestInit = {}): Promise<Response> {
    let session = await this.validSession();
    const send = (token: string) =>
      this.fetchImpl(`${this.url}${path}`, {
        ...init,
        headers: { ...this.headers(token), ...(init.headers as Record<string, string> | undefined) },
      });

    let response = await send(session.accessToken);
    if (response.status === 401) {
      session = await this.refreshSession();
      response = await send(session.accessToken);
    }
    return response;
  }

  /** Mengambil seluruh dokumen data dari server. */
  async pull(): Promise<CloudSnapshot> {
    const response = await this.authed('/rest/v1/app_state?select=key,payload,updated_at');
    if (!response.ok) throw new CloudError(await this.errorMessage(response), response.status);
    const rows = (await response.json()) as Array<{ key: string; payload: unknown; updated_at: string }>;
    const snapshot: CloudSnapshot = {};
    rows.forEach((row) => {
      snapshot[row.key] = { payload: row.payload, updatedAt: row.updated_at };
    });
    return snapshot;
  }

  /** Menyimpan satu dokumen data (upsert). Mengembalikan stempel waktunya. */
  async push(key: string, payload: unknown): Promise<string> {
    const session = await this.validSession();
    const updatedAt = new Date().toISOString();
    const response = await this.authed('/rest/v1/app_state', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([
        { key, payload, updated_at: updatedAt, updated_by: session.userId || null },
      ]),
    });
    if (!response.ok) throw new CloudError(await this.errorMessage(response), response.status);
    return updatedAt;
  }
}

let sharedClient: CloudClient | null = null;

export function getCloudClient(): CloudClient | null {
  const config = getCloudConfig();
  if (!config) return null;
  if (!sharedClient) sharedClient = new CloudClient(config);
  return sharedClient;
}

export function resetCloudClientForTests(): void {
  sharedClient = null;
}

export type SyncState = 'idle' | 'syncing' | 'error';

export interface CloudSyncStatus {
  mode: 'lokal' | 'cloud';
  state: SyncState;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface CloudSyncOptions {
  client: CloudClient;
  readLocal(key: CloudDataKey): unknown;
  writeLocal(key: CloudDataKey, payload: unknown): void;
  pushDelayMs?: number;
  pullIntervalMs?: number;
  retryDelayMs?: number;
  now?: () => number;
}

/**
 * Mesin sinkronisasi dua arah sederhana:
 * - perubahan lokal ditandai "dirty", dikirim setelah jeda singkat (debounce),
 * - server diperiksa berkala, dokumen yang lebih baru ditulis ke lokal,
 * - bila server belum punya dokumen tertentu (instalasi pertama), data lokal
 *   diunggah sebagai isi awal.
 * Konflik diselesaikan last-write-wins per dokumen.
 */
export class CloudSyncEngine {
  readonly client: CloudClient;
  state: SyncState = 'idle';
  lastSyncAt: string | null = null;
  lastError: string | null = null;

  private readonly options: CloudSyncOptions;
  private readonly dirty = new Set<CloudDataKey>();
  private readonly lastKnown: Record<string, number> = {};
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pullTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(options: CloudSyncOptions) {
    this.options = options;
    this.client = options.client;
  }

  private get now(): number {
    return this.options.now ? this.options.now() : Date.now();
  }

  private stamp(value: string): number {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private setState(state: SyncState): void {
    this.state = state;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ypwi_sync_status'));
    }
  }

  private fail(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.setState('error');
    if (!this.stopped && this.dirty.size > 0) {
      this.schedulePush(this.options.retryDelayMs ?? 8000);
    }
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.pull();
    this.pullTimer = setInterval(() => {
      void this.pull();
    }, this.options.pullIntervalMs ?? 20_000);
  }

  stop(): void {
    this.stopped = true;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.pullTimer) clearInterval(this.pullTimer);
    this.pushTimer = null;
    this.pullTimer = null;
  }

  markDirty(keys: readonly CloudDataKey[] = CLOUD_DATA_KEYS): void {
    keys.forEach((key) => this.dirty.add(key));
    this.schedulePush();
  }

  /** Menandai seluruh data lokal untuk dikirim (dipakai tombol "Sinkronkan sekarang"). */
  markAllDirty(): void {
    this.markDirty();
  }

  private schedulePush(delay = this.options.pushDelayMs ?? 900): void {
    if (this.stopped) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.push();
    }, delay);
  }

  async pull(): Promise<void> {
    if (this.stopped) return;
    this.setState('syncing');
    try {
      const snapshot = await this.client.pull();
      const missing: CloudDataKey[] = [];

      CLOUD_DATA_KEYS.forEach((key) => {
        const row = snapshot[key];
        if (!row) {
          missing.push(key);
          return;
        }
        if (this.dirty.has(key)) return;
        const remoteStamp = this.stamp(row.updatedAt);
        if (remoteStamp > (this.lastKnown[key] ?? 0)) {
          this.options.writeLocal(key, row.payload);
          this.lastKnown[key] = remoteStamp;
        }
      });

      this.lastSyncAt = new Date(this.now).toISOString();
      this.lastError = null;
      this.setState('idle');

      if (missing.length > 0 && Object.keys(this.lastKnown).length === 0) {
        // Database masih kosong: unggah data lokal sebagai isi awal.
        this.markDirty(missing);
      }
    } catch (error) {
      this.fail(error);
    }
  }

  async push(): Promise<void> {
    if (this.stopped || this.dirty.size === 0) return;
    this.setState('syncing');
    const keys = Array.from(this.dirty);
    try {
      for (const key of keys) {
        const updatedAt = await this.client.push(key, this.options.readLocal(key));
        this.lastKnown[key] = this.stamp(updatedAt);
        this.dirty.delete(key);
      }
      this.lastSyncAt = new Date(this.now).toISOString();
      this.lastError = null;
      this.setState('idle');
    } catch (error) {
      this.fail(error);
    }
  }
}

let activeEngine: CloudSyncEngine | null = null;

export function startCloudSync(options: CloudSyncOptions): CloudSyncEngine | null {
  if (!isCloudEnabled()) return null;
  stopCloudSync();
  activeEngine = new CloudSyncEngine(options);
  void activeEngine.start();
  return activeEngine;
}

export function stopCloudSync(): void {
  if (activeEngine) {
    activeEngine.stop();
    activeEngine = null;
  }
}

export function getActiveSyncEngine(): CloudSyncEngine | null {
  return activeEngine;
}

/** Kirim perubahan tertunda lalu ambil perubahan terbaru dari server. */
export async function syncNow(): Promise<void> {
  const engine = activeEngine;
  if (!engine) return;
  engine.markAllDirty();
  await engine.push();
  await engine.pull();
}

export function getSyncStatus(): CloudSyncStatus {
  return {
    mode: isCloudEnabled() ? 'cloud' : 'lokal',
    state: activeEngine?.state ?? 'idle',
    lastSyncAt: activeEngine?.lastSyncAt ?? null,
    lastError: activeEngine?.lastError ?? null,
  };
}
