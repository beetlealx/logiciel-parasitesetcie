// Tests du typage des lignes de devis.
// Lancer : node --experimental-strip-types --test lib/typage.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { datesPassages, modeFacturationParDefaut, normalize, typerDevis, typerLigne, type PrestationTypeDef } from './typage.ts'

const T = (code: string, module: PrestationTypeDef['module'], keywords: string[], ordre: number, billing: PrestationTypeDef['default_billing'] = 'par_passage'): PrestationTypeDef =>
  ({ code, label: code, module, keywords, schedule_offsets: [0, 15], default_duration_min: 60, default_billing: billing, ordre })

const TYPES: PrestationTypeDef[] = [
  T('rongeurs', 'rongeurs', ['rat', 'rats', 'souris', 'rongeur', 'rongeurs', 'deratisation'], 1),
  T('moustiques', 'moustiques', ['moustique', 'moustiques', 'geyser', 'moustique tigre'], 2, 'par_contrat'),
  T('blattes', 'photo', ['blatte', 'blattes', 'cafard', 'cafards'], 3),
  T('punaises', 'photo', ['punaise', 'punaises', 'punaises de lit'], 4),
  T('fourmis', 'photo', ['fourmi', 'fourmis'], 5),
  T('diogene', 'photo', ['diogene', 'debarras', 'debarrassage'], 8, 'par_contrat'),
]

const L = (label: string, product_ref: string | null = null, description = '') =>
  ({ rowid: 1, product_ref, label, description, qty: 1, total_ht: 100 })

test('normalize retire accents, HTML et ponctuation', () => {
  assert.equal(normalize('Dératisation <b>cave</b> &amp; réserve !'), 'deratisation cave reserve')
})

test('la référence produit prime sur les mots-clés', () => {
  const r = typerLigne(L('Traitement souris', 'DESINS-01'), TYPES, { 'DESINS-01': 'blattes' })
  assert.deepEqual(r.type_codes, ['blattes'])
  assert.equal(r.source, 'produit')
})

test('texte libre : mots-clés avec accents et majuscules', () => {
  assert.deepEqual(typerLigne(L('DÉRATISATION des parties communes'), TYPES, {}).type_codes, ['rongeurs'])
  assert.deepEqual(typerLigne(L('Traitement Punaises de lit — T3'), TYPES, {}).type_codes, ['punaises'])
  assert.deepEqual(typerLigne(L('Débarrassage logement syndrome de Diogène'), TYPES, {}).type_codes, ['diogene'])
})

test('pas de faux positif sur un mot qui contient le mot-clé', () => {
  // « rat » ne doit pas matcher « ratio », « gratuit » ou « intégration »
  assert.deepEqual(typerLigne(L('Diagnostic gratuit, intégration ratio'), TYPES, {}).type_codes, [])
})

test('une ligne peut couvrir plusieurs types', () => {
  assert.deepEqual(typerLigne(L('Traitement blattes et fourmis cuisine'), TYPES, {}).type_codes, ['blattes', 'fourmis'])
})

test('mot-clé dans la description seule', () => {
  assert.deepEqual(typerLigne(L('Intervention', null, '<p>Pose de pièges à moustiques</p>'), TYPES, {}).type_codes, ['moustiques'])
})

test('frais de déplacement : ignorés, ne rendent pas le devis « à typer »', () => {
  const r = typerDevis([L('Déplacement Lyon'), L('Traitement cafards')], TYPES, {})
  assert.equal(r.a_typer, false)
  assert.deepEqual(r.type_codes, ['blattes'])
  assert.equal(r.lignes_non_typees, 0)
  assert.equal(r.lignes[0].ignoree, true)
})

test('devis sans aucune ligne reconnue → à typer', () => {
  const r = typerDevis([L('Prestation selon visite'), L('Déplacement')], TYPES, {})
  assert.equal(r.a_typer, true)
  assert.equal(r.lignes_non_typees, 1)
})

test('types distincts triés dans l’ordre du référentiel', () => {
  const r = typerDevis([L('Blattes'), L('Rats'), L('Souris')], TYPES, {})
  assert.deepEqual(r.type_codes, ['rongeurs', 'blattes'])
})

test('dates de passages : signature + décalages', () => {
  assert.deepEqual(datesPassages(new Date('2026-11-12T15:30:00Z'), [0, 15, 30]), ['2026-11-12', '2026-11-27', '2026-12-12'])
  assert.deepEqual(datesPassages(new Date('2026-11-12T08:00:00Z'), []), ['2026-11-12'])
})

test('mode de facturation par défaut', () => {
  assert.equal(modeFacturationParDefaut(['blattes'], TYPES), 'par_passage')
  assert.equal(modeFacturationParDefaut(['blattes', 'moustiques'], TYPES), 'par_contrat')
})
