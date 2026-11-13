import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

export interface PDFArticle {
  label: string
  releves: Record<string, unknown>
}

export interface PDFPhoto {
  base64: string
  caption: string | null
  phase?: 'avant' | 'apres' | null
}

// Mentions légales imprimées en pied de chaque rapport
const LEGAL = 'SARL Parasites et Compagnie · RCS Lyon 131 874 760 · Certibiocide n° 115445'

export interface PDFBiocide {
  produit: string
  quantite: string
  numero_amm?: string
  substance_active?: string
  zone_traitee?: string
  mode_application?: string
  delai_reentree?: string
}

export type PDFSeverity = 'forte' | 'moderee' | 'inactive' | 'non-releve'

export interface PDFHistoryEntry {
  reference: string
  intervention_date: string
  intervention_type: string | null
  severity: PDFSeverity
}

export interface PDFData {
  reference: string
  intervention_date: string
  technician_name: string
  type_intervention: string | null
  intervention_type?: string | null
  extra_data?: Record<string, unknown> | null
  client_name: string
  client_address: string
  client_email: string | null
  synthese: string | null
  signataire_nom: string | null
  signature_data_url: string | null
  postes: PDFArticle[]
  planBase64: string | null
  photos: PDFPhoto[]
  logoBase64?: string | null
  history?: PDFHistoryEntry[]
  biocides?: PDFBiocide[]
}

interface ArticleColumn { key: string; label: string; flex?: number }

const ARTICLE_COLUMNS: Record<string, ArticleColumn[]> = {
  rats: [
    { key: 'etat', label: 'État' },
    { key: 'consommation', label: 'Consommation' },
    { key: 'traces', label: 'Traces' },
    { key: 'action', label: 'Action' },
  ],
  frelons_guepes: [
    { key: 'espece', label: 'Espèce', flex: 2 },
    { key: 'hauteur', label: 'Haut. (m)' },
    { key: 'localisation', label: 'Localisation', flex: 2 },
    { key: 'neutralise', label: 'Neutralisé' },
  ],
  punaises_lit: [
    { key: 'piece', label: 'Pièce', flex: 2 },
    { key: 'infestation', label: 'Infestation' },
    { key: 'methode', label: 'Méthode' },
    { key: 'produit', label: 'Produit', flex: 2 },
  ],
  fourmis: [
    { key: 'espece', label: 'Espèce', flex: 2 },
    { key: 'type_traitement', label: 'Type' },
    { key: 'produit', label: 'Produit', flex: 2 },
  ],
  cafards: [
    { key: 'espece', label: 'Espèce', flex: 2 },
    { key: 'infestation', label: 'Niveau' },
    { key: 'produit', label: 'Produit', flex: 2 },
  ],
  moustiques: [
    { key: 'espece', label: 'Espèce', flex: 2 },
    { key: 'type_traitement', label: 'Type' },
    { key: 'surface_m2', label: 'Surface (m²)' },
    { key: 'produit', label: 'Produit', flex: 2 },
  ],
}

const ARTICLES_TITLE: Record<string, string> = {
  rats: "Postes d'appâtage",
  frelons_guepes: 'Nids identifiés et traités',
  punaises_lit: 'Zones traitées',
  fourmis: 'Points de traitement',
  cafards: 'Zones de traitement',
  moustiques: 'Zones traitées',
}

const TYPE_LABELS: Record<string, string> = {
  rats:           'Dératisation',
  frelons_guepes: 'Frelons & Guêpes',
  punaises_lit:   'Punaises de lit',
  fourmis:        'Fourmis',
  cafards:        'Cafards / Blattes',
  moustiques:     'Moustiques',
  mixte:          'Multi-nuisibles',
}

const P = '#c0392b'
const BORDER = '#e7e5e4'
const BG = '#f9f9f8'
const MUTED = '#78716c'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#1c1917', lineHeight: 1.45 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: `1.5 solid ${P}`, marginBottom: 18 },
  company: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: P },
  tagline: { fontSize: 7.5, color: MUTED, marginTop: 3 },
  refBlock: { alignItems: 'flex-end' },
  refNum: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  refSub: { fontSize: 8, color: MUTED, marginTop: 3 },

  // Section title
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: P, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 18 },

  // Info rows
  infoBlock: { backgroundColor: BG, padding: 10, borderRadius: 4, marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  lbl: { width: 100, color: MUTED, fontSize: 8.5 },
  val: { flex: 1, fontSize: 8.5 },

  // Postes table
  table: { borderTop: `1 solid ${BORDER}`, borderLeft: `1 solid ${BORDER}` },
  tHead: { flexDirection: 'row', backgroundColor: BG },
  tRow: { flexDirection: 'row' },
  tCell: { flex: 1, padding: '5 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 8.5 },
  tCellH: { flex: 1, padding: '5 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED },
  tCellLabel: { width: 42, padding: '5 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  tCellLabelH: { width: 42, padding: '5 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED },

  // Photos
  photoRow: { flexDirection: 'row', marginBottom: 10 },
  photoCol: { flex: 1 },
  photoImg: { width: '100%', height: 138, objectFit: 'contain' },
  photoCaption: { fontSize: 7.5, color: MUTED, marginTop: 4 },
  photoSpacer: { flex: 1, marginLeft: 10 },

  // Synthèse
  syntheseBox: { backgroundColor: BG, padding: 10, borderRadius: 4, fontSize: 9, lineHeight: 1.6 },

  // Historique
  histTable: { borderTop: `1 solid ${BORDER}`, borderLeft: `1 solid ${BORDER}`, marginTop: 4 },
  histRow: { flexDirection: 'row' },
  histCellDate: { width: 80, padding: '4 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 8 },
  histCellType: { flex: 1, padding: '4 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 8 },
  histCellSev: { width: 70, padding: '4 6', borderBottom: `1 solid ${BORDER}`, borderRight: `1 solid ${BORDER}`, fontSize: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  histDot: { width: 7, height: 7, borderRadius: 4 },

  // Signature
  sigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  sigBlock: { flex: 1 },
  sigImg: { height: 80, objectFit: 'contain', objectPositionX: 0 },
  sigLine: { borderTop: `1 solid #1c1917`, paddingTop: 4, marginTop: 2 },
  sigName: { fontSize: 8, color: MUTED },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: MUTED, borderTop: `1 solid ${BORDER}`, paddingTop: 8 },
})

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function val(v: string | null) { return v ?? '—' }

const SEV_COLOR: Record<PDFSeverity, string> = {
  forte: '#c0392b',
  moderee: '#d97706',
  inactive: '#059669',
  'non-releve': '#d6d3d1',
}
const SEV_LABEL: Record<PDFSeverity, string> = {
  forte: 'Forte',
  moderee: 'Modérée',
  inactive: 'Inactive',
  'non-releve': '—',
}

export function InterventionPDF(data: PDFData) {
  // Photos regroupées : avant traitement, après traitement, puis les autres
  const rowsOf = (list: PDFPhoto[]) => {
    const rows: PDFPhoto[][] = []
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2))
    return rows
  }
  const avecPhase = data.photos.some(p => p.phase)
  const photoGroups: { title: string; rows: PDFPhoto[][] }[] = avecPhase
    ? [
        { title: 'Avant traitement', rows: rowsOf(data.photos.filter(p => p.phase === 'avant')) },
        { title: 'Après traitement', rows: rowsOf(data.photos.filter(p => p.phase === 'apres')) },
        { title: 'Autres photos', rows: rowsOf(data.photos.filter(p => !p.phase)) },
      ].filter(g => g.rows.length > 0)
    : [{ title: 'Photos', rows: rowsOf(data.photos) }].filter(g => g.rows.length > 0)

  const itype = data.intervention_type ?? 'rats'
  const articleCols = ARTICLE_COLUMNS[itype] ?? ARTICLE_COLUMNS.rats
  const articlesTitle = ARTICLES_TITLE[itype] ?? 'Relevés'
  const extra = data.extra_data ?? {}
  const especeIdentifiee = (extra.espece as string) ?? ''
  const typeLabel = TYPE_LABELS[itype] ?? itype

  // Extra data helpers
  const conditions = (extra.conditions as Record<string, unknown>) ?? {}
  const epiItems = (conditions.epi as Record<string, boolean>) ?? {}
  const equipItems = (conditions.equipements as Record<string, boolean>) ?? {}
  const accesNotes = (conditions.acces_notes as string) ?? ''
  const etatInitial = (extra.etat_initial as Record<string, unknown>) ?? {}
  const etatSignes = (etatInitial.signes as string[]) ?? []
  const consignesPost = (extra.consignes_post as Record<string, unknown>) ?? {}

  return (
    <Document title={data.reference} author="Parasites et Compagnie">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {data.logoBase64 && (
              <Image src={data.logoBase64} style={{ height: 44, width: 44, objectFit: 'contain' }} />
            )}
            <View>
              <Text style={s.company}>Parasites et Compagnie</Text>
              <Text style={s.tagline}>Dératisation · Désinsectisation · Désinfection</Text>
            </View>
          </View>
          <View style={s.refBlock}>
            <Text style={s.refNum}>{data.reference}</Text>
            <Text style={s.refSub}>Compte rendu d'intervention</Text>
            <Text style={[s.refSub, { marginTop: 4, color: P, fontFamily: 'Helvetica-Bold' }]}>{typeLabel}</Text>
          </View>
        </View>

        {/* Infos générales */}
        <Text style={s.sectionTitle}>Informations générales</Text>
        <View style={s.infoBlock}>
          <View style={s.row}><Text style={s.lbl}>Date</Text><Text style={s.val}>{fmt(data.intervention_date)}</Text></View>
          <View style={s.row}><Text style={s.lbl}>Technicien</Text><Text style={s.val}>{data.technician_name}</Text></View>
          <View style={s.row}><Text style={s.lbl}>Nuisible</Text><Text style={s.val}>{typeLabel}</Text></View>
          {especeIdentifiee ? (
            <View style={s.row}><Text style={s.lbl}>Espèce identifiée</Text><Text style={s.val}>{especeIdentifiee}</Text></View>
          ) : null}
          {data.type_intervention ? (
            <View style={s.row}><Text style={s.lbl}>Type d'intervention</Text><Text style={s.val}>{data.type_intervention}</Text></View>
          ) : null}
        </View>

        {/* Client */}
        <Text style={s.sectionTitle}>Client</Text>
        <View style={s.infoBlock}>
          <View style={s.row}><Text style={s.lbl}>Nom</Text><Text style={s.val}>{data.client_name}</Text></View>
          {data.client_address && (
            <View style={s.row}><Text style={s.lbl}>Adresse</Text><Text style={s.val}>{data.client_address}</Text></View>
          )}
          {data.client_email && (
            <View style={s.row}><Text style={s.lbl}>Email</Text><Text style={s.val}>{data.client_email}</Text></View>
          )}
        </View>

        {/* Conditions d'intervention (frelons) */}
        {itype === 'frelons_guepes' && (
          <>
            <Text style={s.sectionTitle}>Conditions d'intervention</Text>
            <View style={s.infoBlock}>
              {Object.keys(epiItems).length > 0 && (
                <View style={s.row}>
                  <Text style={s.lbl}>EPI portés</Text>
                  <Text style={s.val}>{Object.entries(epiItems).filter(([,v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ') || '—'}</Text>
                </View>
              )}
              {Object.keys(equipItems).length > 0 && (
                <View style={s.row}>
                  <Text style={s.lbl}>Équipements</Text>
                  <Text style={s.val}>{Object.entries(equipItems).filter(([,v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ') || '—'}</Text>
                </View>
              )}
              {accesNotes ? (
                <View style={s.row}><Text style={s.lbl}>Accès / notes</Text><Text style={s.val}>{accesNotes}</Text></View>
              ) : null}
            </View>
          </>
        )}

        {/* État initial (punaises) */}
        {itype === 'punaises_lit' && Object.keys(etatInitial).length > 0 && (
          <>
            <Text style={s.sectionTitle}>État initial du logement</Text>
            <View style={s.infoBlock}>
              {!!etatInitial.niveau_infestation ? (
                <View style={s.row}><Text style={s.lbl}>Niveau d'infestation</Text><Text style={[s.val, { fontFamily: 'Helvetica-Bold' }]}>{String(etatInitial.niveau_infestation)}</Text></View>
              ) : null}
              {!!etatInitial.nb_pieces ? (
                <View style={s.row}><Text style={s.lbl}>Pièces concernées</Text><Text style={s.val}>{String(etatInitial.nb_pieces)}</Text></View>
              ) : null}
              {etatSignes.length > 0 ? (
                <View style={s.row}><Text style={s.lbl}>Signes observés</Text><Text style={s.val}>{etatSignes.join(' · ')}</Text></View>
              ) : null}
            </View>
          </>
        )}

        {/* Plan */}
        {data.planBase64 && (
          <>
            <Text style={s.sectionTitle}>Plan d'implantation</Text>
            <Image src={data.planBase64} style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} />
          </>
        )}

        {/* Articles */}
        {data.postes.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{articlesTitle}</Text>
            <View style={s.table}>
              <View style={s.tHead}>
                <Text style={s.tCellLabelH}>{itype === 'frelons_guepes' ? 'Nid' : itype === 'punaises_lit' ? 'Zone' : 'Réf.'}</Text>
                {articleCols.map(c => (
                  <Text key={c.key} style={[s.tCellH, c.flex ? { flex: c.flex } : {}]}>{c.label}</Text>
                ))}
              </View>
              {data.postes.map((p, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={s.tCellLabel}>{p.label}</Text>
                  {articleCols.map(c => {
                    const raw = p.releves[c.key]
                    const display = raw === true ? 'Oui' : raw === false ? 'Non' : raw != null ? String(raw) : '—'
                    return <Text key={c.key} style={[s.tCell, c.flex ? { flex: c.flex } : {}]}>{display}</Text>
                  })}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Biocides */}
        {data.biocides && data.biocides.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Produits biocides utilisés</Text>
            <View style={s.table}>
              <View style={s.tHead}>
                <Text style={[s.tCellH, { flex: 2 }]}>Produit</Text>
                <Text style={[s.tCellH, { flex: 1.5 }]}>Substance active</Text>
                <Text style={s.tCellH}>N° AMM</Text>
                <Text style={s.tCellH}>Quantité</Text>
                <Text style={[s.tCellH, { flex: 1.5 }]}>Zone traitée</Text>
                <Text style={s.tCellH}>Réentrée</Text>
              </View>
              {data.biocides.map((b, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={[s.tCell, { flex: 2 }]}>{b.produit || '—'}</Text>
                  <Text style={[s.tCell, { flex: 1.5 }]}>{b.substance_active || '—'}</Text>
                  <Text style={s.tCell}>{b.numero_amm || '—'}</Text>
                  <Text style={s.tCell}>{b.quantite || '—'}</Text>
                  <Text style={[s.tCell, { flex: 1.5 }]}>{b.zone_traitee || '—'}</Text>
                  <Text style={s.tCell}>{b.delai_reentree || '—'}</Text>
                </View>
              ))}
            </View>
            {data.biocides.some(b => b.mode_application) && (
              <View style={{ marginTop: 4 }}>
                {data.biocides.filter(b => b.mode_application).map((b, i) => (
                  <Text key={i} style={{ fontSize: 8, color: '#57534e', marginBottom: 2 }}>
                    {b.produit} — Mode d&apos;application : {b.mode_application}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}

        {/* Photos */}
        {photoGroups.map(group => (
          <View key={group.title}>
            <Text style={s.sectionTitle}>{group.title}</Text>
            {group.rows.map((row, ri) => (
              <View key={ri} style={s.photoRow}>
                <View style={s.photoCol}>
                  <Image src={row[0].base64} style={s.photoImg} />
                  {row[0].caption && <Text style={s.photoCaption}>{row[0].caption}</Text>}
                </View>
                {row[1] ? (
                  <View style={[s.photoCol, { marginLeft: 10 }]}>
                    <Image src={row[1].base64} style={s.photoImg} />
                    {row[1].caption && <Text style={s.photoCaption}>{row[1].caption}</Text>}
                  </View>
                ) : (
                  <View style={s.photoSpacer} />
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Synthèse */}
        {data.synthese && (
          <>
            <Text style={s.sectionTitle}>Synthèse</Text>
            <View style={s.syntheseBox}>
              <Text>{data.synthese}</Text>
            </View>
          </>
        )}

        {/* Consignes post-traitement (punaises) */}
        {itype === 'punaises_lit' && Object.keys(consignesPost).length > 0 && (
          <>
            <Text style={s.sectionTitle}>Consignes post-traitement</Text>
            <View style={s.infoBlock}>
              {!!consignesPost.delai_reintegration ? (
                <View style={s.row}><Text style={s.lbl}>Délai de réintégration</Text><Text style={[s.val, { fontFamily: 'Helvetica-Bold' }]}>{String(consignesPost.delai_reintegration)}</Text></View>
              ) : null}
              {!!consignesPost.nb_passages_prevus ? (
                <View style={s.row}><Text style={s.lbl}>Passages prévus</Text><Text style={s.val}>{String(consignesPost.nb_passages_prevus)}</Text></View>
              ) : null}
              {!!consignesPost.consignes ? (
                <View style={s.row}><Text style={s.lbl}>Consignes</Text><Text style={[s.val, { lineHeight: 1.6 }]}>{String(consignesPost.consignes)}</Text></View>
              ) : null}
            </View>
          </>
        )}

        {/* Historique des visites */}
        {data.history && data.history.length > 0 && (
          <>
            <Text break style={s.sectionTitle}>Historique des visites — {data.client_name}</Text>
            <View style={s.histTable}>
              <View style={s.histRow}>
                <Text style={[s.histCellDate, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Date</Text>
                <Text style={[s.histCellType, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Type</Text>
                <Text style={[s.histCellSev, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Activité</Text>
              </View>
              {data.history.map((h, i) => (
                <View key={i} style={s.histRow}>
                  <Text style={s.histCellDate}>{fmt(h.intervention_date)}</Text>
                  <Text style={s.histCellType}>{h.intervention_type ? (TYPE_LABELS[h.intervention_type] ?? h.intervention_type) : '—'}</Text>
                  <View style={s.histCellSev}>
                    <View style={[s.histDot, { backgroundColor: SEV_COLOR[h.severity] }]} />
                    <Text style={{ fontSize: 8, color: h.severity === 'non-releve' ? MUTED : SEV_COLOR[h.severity] }}>{SEV_LABEL[h.severity]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Signature */}
        {data.signature_data_url && (
          <>
            <Text style={s.sectionTitle}>Signature</Text>
            <View style={s.sigRow}>
              <View style={s.sigBlock}>
                <Image src={data.signature_data_url} style={s.sigImg} />
                <View style={s.sigLine}>
                  <Text style={s.sigName}>{data.signataire_nom}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }} />
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          {/* Pas de numéro de page « render » : avec @react-pdf 4.5 il fait disparaître tout le pied de page */}
          <Text>{LEGAL}</Text>
          <Text>{data.reference}</Text>
        </View>

      </Page>
    </Document>
  )
}
