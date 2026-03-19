-- AUTH-BADGE CM14 — Schéma PostgreSQL
-- Version 1.0 — Phase 3

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(20)  PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('agent', 'admin', 'supervisor')),
  name          VARCHAR(100) NOT NULL,
  zone          VARCHAR(100),
  title         VARCHAR(100),
  totp_secret   VARCHAR(64)  NOT NULL,
  is_locked     BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Zones ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id          VARCHAR(10)  PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  description TEXT
);

-- ─── Points de contrôle ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_controle (
  id        VARCHAR(20) PRIMARY KEY,
  nom       VARCHAR(100) NOT NULL,
  agent_id  VARCHAR(20)  REFERENCES users(id) ON DELETE SET NULL,
  statut    VARCHAR(20)  NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'alerte', 'hors-ligne')),
  scans     INTEGER      NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ
);

-- ─── Participants (badge holders) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id               VARCHAR(20)  PRIMARY KEY,
  nom              VARCHAR(100) NOT NULL,
  prenom           VARCHAR(100) NOT NULL,
  delegation       VARCHAR(100) NOT NULL,
  categorie        VARCHAR(10)  NOT NULL,
  zones            TEXT[]       NOT NULL DEFAULT '{}',
  statut           VARCHAR(20)  NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'révoqué', 'suspendu')),
  date_expiration  DATE         NOT NULL,
  photo_url        VARCHAR(255),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Journal des scans ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_logs (
  id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id    VARCHAR(20)  REFERENCES participants(id) ON DELETE SET NULL,
  nom               VARCHAR(100) NOT NULL,
  delegation        VARCHAR(100),
  categorie         VARCHAR(10),
  zone              VARCHAR(100),
  point_controle_id VARCHAR(20)  REFERENCES points_controle(id) ON DELETE SET NULL,
  resultat          VARCHAR(20)  NOT NULL CHECK (resultat IN ('autorisé', 'révoqué', 'zone-refusée', 'inconnu')),
  agent_id          VARCHAR(20)  REFERENCES users(id) ON DELETE SET NULL,
  timestamp         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Refresh tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Alertes de masse ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message    TEXT        NOT NULL,
  level      VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
  author_id  VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Index pour les performances ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp       ON scan_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_agent_id        ON scan_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_participant_id  ON scan_logs (participant_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_resultat        ON scan_logs (resultat);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_participants_statut       ON participants (statut);
