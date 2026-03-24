/**
 * Génération du badge officiel CM14 — format vertical
 * Utilisé par BadgeInscription et ParticipantManagement.
 *
 * @param {object} participant  — { id, prenom, nom, delegation, categorie, zones, dateExpiration }
 * @param {HTMLCanvasElement} qrEl — canvas QR déjà rendu par qrcode.react
 * @returns {HTMLCanvasElement|null}
 */

export const CAT_META = {
  DEL:   { color: '#1e40af', label: 'DÉLÉGUÉ'      },
  OBS:   { color: '#475569', label: 'OBSERVATEUR'  },
  PRESS: { color: '#d97706', label: 'PRESSE'        },
  STAFF: { color: '#16a34a', label: 'PERSONNEL'     },
  VIP:   { color: '#7c3aed', label: 'VIP'           },
  SEC:   { color: '#dc2626', label: 'SÉCURITÉ'      },
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function buildBadgeCanvas(participant, qrEl) {
  if (!qrEl || !participant) return null

  const W = 420, H = 660
  const S = 2 // facteur d'échelle pour une résolution 2× (QR plus net)
  const cv = document.createElement('canvas')
  cv.width = W * S; cv.height = H * S
  const c = cv.getContext('2d')
  c.scale(S, S)

  const cat      = CAT_META[participant.categorie] ?? CAT_META.DEL
  const catColor = cat.color
  const catLabel = cat.label

  // ── Fond blanc ───────────────────────────────────────────────────────
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, W, H)

  // ── Header dégradé bleu (0–110px) ────────────────────────────────────
  const hdrGrad = c.createLinearGradient(0, 0, W, 110)
  hdrGrad.addColorStop(0, '#0f2d6b')
  hdrGrad.addColorStop(1, '#1e40af')
  c.fillStyle = hdrGrad
  c.fillRect(0, 0, W, 110)

  // Cercles décoratifs
  c.save()
  c.globalAlpha = 0.07
  c.fillStyle = '#ffffff'
  c.beginPath(); c.arc(370, -15, 130, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.arc(25,  100,  65, 0, Math.PI * 2); c.fill()
  c.restore()

  // Mini logo OMC
  c.fillStyle = 'rgba(255,255,255,0.15)'
  rr(c, 16, 14, 44, 44, 8); c.fill()
  c.fillStyle = '#ffffff'; c.font = 'bold 14px Arial'
  c.textAlign = 'center'; c.fillText('OMC', 38, 41)

  // Titre
  c.fillStyle = '#ffffff'; c.font = 'bold 26px Arial'
  c.textAlign = 'center'; c.fillText('CM14', W / 2, 52)
  c.fillStyle = '#93c5fd'; c.font = 'bold 9px Arial'
  c.fillText('CONFÉRENCE MINISTÉRIELLE', W / 2, 71)
  c.fillStyle = '#bfdbfe'; c.font = '8.5px Arial'
  c.fillText('YAOUNDÉ  ·  CAMEROUN  ·  2026', W / 2, 88)

  // ── Bandeau catégorie (110–148px) ────────────────────────────────────
  c.fillStyle = catColor
  c.fillRect(0, 110, W, 38)
  c.fillStyle = '#ffffff'; c.font = 'bold 13px Arial'
  c.textAlign = 'center'; c.fillText(catLabel, W / 2, 135)

  // ── Avatar (centre à y=202, r=50) ────────────────────────────────────
  const ax = W / 2, ay = 202, ar = 50
  c.save()
  c.shadowColor = 'rgba(0,0,0,0.2)'; c.shadowBlur = 14; c.shadowOffsetY = 4
  c.fillStyle = catColor
  c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.fill()
  c.restore()
  c.strokeStyle = '#ffffff'; c.lineWidth = 3.5
  c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.stroke()
  c.fillStyle = '#ffffff'; c.font = 'bold 28px Arial'
  c.textAlign = 'center'; c.textBaseline = 'middle'
  const initials = `${participant.prenom?.charAt(0) ?? ''}${participant.nom?.charAt(0) ?? ''}`
  c.fillText(initials, ax, ay)
  c.textBaseline = 'alphabetic'

  // ── Nom / Délégation (265–335px) ─────────────────────────────────────
  c.fillStyle = '#64748b'; c.font = '15px Arial'
  c.textAlign = 'center'; c.fillText(participant.prenom, W / 2, 270)
  c.fillStyle = '#0f172a'; c.font = 'bold 24px Arial'
  c.fillText(participant.nom.toUpperCase(), W / 2, 300)
  c.fillStyle = '#64748b'; c.font = '13px Arial'
  c.fillText(participant.delegation, W / 2, 322)

  // Trait décoratif
  c.fillStyle = catColor; c.fillRect(W / 2 - 28, 336, 56, 3)

  // ── Zones (350–395px) ────────────────────────────────────────────────
  if (participant.zones?.length > 0) {
    c.fillStyle = '#94a3b8'; c.font = 'bold 8px Arial'
    c.textAlign = 'center'; c.fillText('ZONES AUTORISÉES', W / 2, 356)
    c.font = 'bold 10px Arial'
    const tagH = 22
    const tagWidths = participant.zones.map(z => c.measureText(z).width + 20)
    const totalZW = tagWidths.reduce((a, b) => a + b, 0) + (participant.zones.length - 1) * 6
    let zx = W / 2 - totalZW / 2
    participant.zones.forEach((z, i) => {
      const tw = tagWidths[i]
      rr(c, zx, 362, tw, tagH, 5)
      c.fillStyle = catColor + '1a'; c.fill()
      c.strokeStyle = catColor + '80'; c.lineWidth = 1; c.stroke()
      c.fillStyle = catColor; c.textAlign = 'center'
      c.fillText(z, zx + tw / 2, 378)
      zx += tw + 6
    })
  }

  // ── QR Code (400–600px) ──────────────────────────────────────────────
  const qrSize = 190
  const qrX    = W / 2 - qrSize / 2
  const qrY    = 400

  // Cadre blanc avec ombre
  c.save()
  c.shadowColor = 'rgba(0,0,0,0.10)'; c.shadowBlur = 12
  rr(c, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 14)
  c.fillStyle = '#ffffff'; c.fill()
  c.restore()
  c.strokeStyle = '#e2e8f0'; c.lineWidth = 1
  rr(c, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 14); c.stroke()

  // QR canvas — on dessine depuis les dimensions réelles du canvas source
  c.drawImage(qrEl, 0, 0, qrEl.width, qrEl.height, qrX, qrY, qrSize, qrSize)

  // ID sous le QR
  c.fillStyle = '#94a3b8'; c.font = '9px monospace'
  c.textAlign = 'center'; c.fillText(participant.id, W / 2, qrY + qrSize + 18)

  // ── Footer (615–660px) ───────────────────────────────────────────────
  c.fillStyle = '#0f172a'; c.fillRect(0, H - 45, W, 45)
  c.fillStyle = '#475569'; c.font = '8px Arial'
  c.textAlign = 'center'
  c.fillText("AUTH-BADGE CM14 — SYSTÈME DE CONTRÔLE D'ACCÈS OMC", W / 2, H - 24)
  c.fillStyle = '#334155'; c.font = '8px Arial'
  c.fillText(`Valide jusqu'au : ${participant.dateExpiration}`, W / 2, H - 10)

  return cv
}
