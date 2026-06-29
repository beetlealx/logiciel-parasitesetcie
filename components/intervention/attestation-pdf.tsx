import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1c1917', paddingHorizontal: 48, paddingVertical: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 20, borderBottom: '1.5 solid #e7e5e4' },
  logo: { width: 52, height: 52, objectFit: 'contain' },
  companyInfo: { alignItems: 'flex-end', fontSize: 8.5, color: '#78716c', lineHeight: 1.55 },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1c1917', marginBottom: 2 },
  titleBlock: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, color: '#1c1917', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#78716c', letterSpacing: 0.5 },
  refBadge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#f5f5f4', borderRadius: 4, fontSize: 8.5, color: '#57534e', fontFamily: 'Helvetica-Oblique' },
  row2: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  card: { flex: 1, backgroundColor: '#fafaf9', border: '1 solid #e7e5e4', borderRadius: 6, padding: 14 },
  cardTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  cardLine: { fontSize: 9.5, color: '#1c1917', marginBottom: 3, lineHeight: 1.4 },
  cardSub: { fontSize: 8.5, color: '#78716c', lineHeight: 1.4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f4', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10, borderBottom: '0.5 solid #f0efee' },
  tableCell: { fontSize: 8.5, color: '#1c1917' },
  tableCellSub: { fontSize: 8, color: '#78716c' },
  tableHead: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  legal: { marginTop: 24, paddingTop: 16, borderTop: '0.5 solid #e7e5e4', fontSize: 7.5, color: '#a8a29e', lineHeight: 1.6 },
  sigBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sigBox: { width: 180, borderTop: '1 solid #d6d3d1', paddingTop: 8, alignItems: 'center' },
  sigLabel: { fontSize: 8, color: '#78716c' },
  stamp: { width: 100, height: 100, borderRadius: 50, border: '1.5 solid #e7e5e4', alignItems: 'center', justifyContent: 'center' },
  stampText: { fontSize: 7, color: '#a8a29e', textAlign: 'center', lineHeight: 1.6 },
})

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Traitement frelons / guêpes',
  punaises_lit: 'Traitement punaises de lit', fourmis: 'Traitement fourmis',
  cafards: 'Désinsectisation (cafards / blattes)', moustiques: 'Démoustication',
  mixte: 'Traitement multi-nuisibles',
}

export interface AttestationData {
  reference: string
  intervention_date: string
  technician_name: string
  type_intervention: string | null
  client_name: string
  client_address: string
  logoBase64?: string | null
  biocides?: Array<{
    produit: string
    quantite: string
    numero_amm?: string
    substance_active?: string
    zone_traitee?: string
  }>
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function AttestationPDF({ data }: { data: AttestationData }) {
  const biocides = (data.biocides ?? []).filter(b => b.produit)

  return (
    <Document title={`Attestation ${data.reference}`} author="Parasites et Compagnie">
      <Page size="A4" style={s.page}>

        {/* En-tête */}
        <View style={s.header}>
          {data.logoBase64 ? (
            <Image src={data.logoBase64} style={s.logo} />
          ) : (
            <View style={{ width: 52 }} />
          )}
          <View style={s.companyInfo}>
            <Text style={s.companyName}>Parasites et Compagnie</Text>
            <Text>3D — Désinfection · Désinsectisation · Dératisation</Text>
            <Text>Certification Certibiocide</Text>
          </View>
        </View>

        {/* Titre */}
        <View style={s.titleBlock}>
          <Text style={s.title}>ATTESTATION DE TRAITEMENT</Text>
          <Text style={s.subtitle}>ANTIPARASITAIRE</Text>
          <Text style={s.refBadge}>{data.reference}</Text>
        </View>

        {/* Blocs client / intervention */}
        <View style={s.row2}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Client</Text>
            <Text style={s.cardLine}>{data.client_name}</Text>
            {data.client_address ? (
              <Text style={s.cardSub}>{data.client_address}</Text>
            ) : null}
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Intervention</Text>
            <Text style={s.cardLine}>{fmt(data.intervention_date)}</Text>
            <Text style={s.cardSub}>{TYPE_LABELS[data.type_intervention ?? ''] ?? (data.type_intervention ?? '—')}</Text>
            <Text style={[s.cardSub, { marginTop: 4 }]}>Technicien : {data.technician_name}</Text>
          </View>
        </View>

        {/* Produits utilisés */}
        {biocides.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>Produits biocides utilisés</Text>
            <View style={[s.tableHeader]}>
              <Text style={[s.tableHead, { flex: 3 }]}>Produit</Text>
              <Text style={[s.tableHead, { flex: 2 }]}>N° AMM</Text>
              <Text style={[s.tableHead, { flex: 2 }]}>Substance active</Text>
              <Text style={[s.tableHead, { flex: 1.2 }]}>Quantité</Text>
              <Text style={[s.tableHead, { flex: 2 }]}>Zone</Text>
            </View>
            {biocides.map((b, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{b.produit}</Text>
                <Text style={[s.tableCellSub, { flex: 2 }]}>{b.numero_amm || '—'}</Text>
                <Text style={[s.tableCellSub, { flex: 2 }]}>{b.substance_active || '—'}</Text>
                <Text style={[s.tableCellSub, { flex: 1.2 }]}>{b.quantite || '—'}</Text>
                <Text style={[s.tableCellSub, { flex: 2 }]}>{b.zone_traitee || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Attestation text */}
        <View style={{ backgroundColor: '#fafaf9', border: '1 solid #e7e5e4', borderRadius: 6, padding: 14, marginBottom: 20 }}>
          <Text style={{ fontSize: 9.5, lineHeight: 1.7, color: '#1c1917' }}>
            {'La société Parasites et Compagnie certifie avoir réalisé le traitement antiparasitaire mentionné ci-dessus conformément aux prescriptions réglementaires en vigueur, notamment le décret n°2017-1244 du 7 août 2017 et l\'arrêté du 9 octobre 2013.'}
          </Text>
          <Text style={{ fontSize: 9, lineHeight: 1.7, color: '#78716c', marginTop: 6 }}>
            {'Les produits utilisés disposent d\'une Autorisation de Mise sur le Marché (AMM) délivrée par le Ministère chargé de l\'Environnement. L\'intervention a été effectuée par un technicien titulaire du Certibiocide.'}
          </Text>
        </View>

        {/* Signature */}
        <View style={s.sigBlock}>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Cachet et signature de l'entreprise</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Signature du client / responsable</Text>
          </View>
        </View>

        {/* Mentions légales */}
        <View style={s.legal}>
          <Text>
            {`Document délivré conformément aux articles L522-1 et suivants du Code de l'Environnement. À conserver pendant 5 ans. `}
            {`Parasites et Compagnie — SIRET : 99173650500017 — Numéro Certibiocide : N115445`}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
