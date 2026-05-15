import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

export interface PDFPoste {
  label: string
  etat: string | null
  consommation: string | null
  traces: string | null
  action: string | null
}

export interface PDFPhoto {
  base64: string
  caption: string | null
}

export interface PDFBiocide {
  produit: string
  quantite: string
}

export type PDFSeverity = 'forte' | 'moderee' | 'inactive' | 'non-releve'

export interface PDFHistoryEntry {
  reference: string
  intervention_date: string
  type_intervention: string | null
  severity: PDFSeverity
}

export interface PDFData {
  reference: string
  intervention_date: string
  technician_name: string
  type_intervention: string | null
  client_name: string
  client_address: string
  client_email: string | null
  synthese: string | null
  signataire_nom: string | null
  signature_data_url: string | null
  postes: PDFPoste[]
  planBase64: string | null
  photos: PDFPhoto[]
  logoBase64?: string | null
  history?: PDFHistoryEntry[]
  biocides?: PDFBiocide[]
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
  const photoRows: PDFPhoto[][] = []
  for (let i = 0; i < data.photos.length; i += 2) photoRows.push(data.photos.slice(i, i + 2))

  return (
    <Document title={data.reference} author="Parasites Compagnie">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {data.logoBase64 && (
              <Image src={data.logoBase64} style={{ height: 36, width: 36, objectFit: 'contain' }} />
            )}
            <View>
              <Text style={s.company}>Parasites Compagnie</Text>
              <Text style={s.tagline}>Dératisation · Désinsectisation · Désinfection</Text>
            </View>
          </View>
          <View style={s.refBlock}>
            <Text style={s.refNum}>{data.reference}</Text>
            <Text style={s.refSub}>Compte rendu d'intervention</Text>
          </View>
        </View>

        {/* Infos générales */}
        <Text style={s.sectionTitle}>Informations générales</Text>
        <View style={s.infoBlock}>
          <View style={s.row}><Text style={s.lbl}>Date</Text><Text style={s.val}>{fmt(data.intervention_date)}</Text></View>
          <View style={s.row}><Text style={s.lbl}>Technicien</Text><Text style={s.val}>{data.technician_name}</Text></View>
          {data.type_intervention && (
            <View style={s.row}><Text style={s.lbl}>Type</Text><Text style={s.val}>{data.type_intervention}</Text></View>
          )}
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

        {/* Plan */}
        {data.planBase64 && (
          <>
            <Text style={s.sectionTitle}>Plan d'implantation</Text>
            <Image src={data.planBase64} style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} />
          </>
        )}

        {/* Postes */}
        {data.postes.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Relevés par poste</Text>
            <View style={s.table}>
              <View style={s.tHead}>
                <Text style={s.tCellLabelH}>Poste</Text>
                <Text style={s.tCellH}>État</Text>
                <Text style={s.tCellH}>Consommation</Text>
                <Text style={s.tCellH}>Traces</Text>
                <Text style={s.tCellH}>Action</Text>
              </View>
              {data.postes.map((p, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={s.tCellLabel}>{p.label}</Text>
                  <Text style={s.tCell}>{val(p.etat)}</Text>
                  <Text style={s.tCell}>{val(p.consommation)}</Text>
                  <Text style={s.tCell}>{val(p.traces)}</Text>
                  <Text style={s.tCell}>{val(p.action)}</Text>
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
                <Text style={s.tCellH}>Quantité</Text>
              </View>
              {data.biocides.map((b, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={[s.tCell, { flex: 2 }]}>{b.produit || '—'}</Text>
                  <Text style={s.tCell}>{b.quantite || '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Photos */}
        {photoRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Photos</Text>
            {photoRows.map((row, ri) => (
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
          </>
        )}

        {/* Synthèse */}
        {data.synthese && (
          <>
            <Text style={s.sectionTitle}>Synthèse</Text>
            <View style={s.syntheseBox}>
              <Text>{data.synthese}</Text>
            </View>
          </>
        )}

        {/* Historique des visites */}
        {data.history && data.history.length > 0 && (
          <>
            <Text break style={s.sectionTitle}>Historique des visites — {data.client_name}</Text>
            <View style={s.histTable}>
              {/* Header */}
              <View style={s.histRow}>
                <Text style={[s.histCellDate, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Date</Text>
                <Text style={[s.histCellType, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Type</Text>
                <Text style={[s.histCellSev, { fontFamily: 'Helvetica-Bold', color: MUTED, fontSize: 7.5 }]}>Activité</Text>
              </View>
              {data.history.map((h, i) => (
                <View key={i} style={s.histRow}>
                  <Text style={s.histCellDate}>{fmt(h.intervention_date)}</Text>
                  <Text style={s.histCellType}>{h.type_intervention ?? '—'}</Text>
                  <View style={s.histCellSev}>
                    <View style={[s.histDot, { backgroundColor: SEV_COLOR[h.severity] }]} />
                    <Text style={{ fontSize: 8, color: SEV_COLOR[h.severity] }}>{SEV_LABEL[h.severity]}</Text>
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
          <Text>Parasites Compagnie — {data.reference}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
