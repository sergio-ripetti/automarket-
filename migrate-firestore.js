// One-off migration script: renames buyer.rut -> buyer.idNumber on every
// document in the Firestore "sales" collection, then removes buyer.rut.
//
// Requires a Firebase service account key saved as serviceAccountKey.json
// in the project root (Firebase Console -> Project Settings -> Service
// Accounts -> Generate new private key). That file is gitignored.
//
// Usage:
//   node migrate-firestore.js           (writes changes)
//   node migrate-firestore.js --dry-run (reports what would change, no writes)

import { readFileSync, writeFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const DRY_RUN = process.argv.includes('--dry-run')

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url)))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function migrate() {
  console.log(`Connecting to Firestore project: ${serviceAccount.project_id}`)
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes will be made)\n' : 'Mode: LIVE (changes will be written)\n')

  const snapshot = await db.collection('sales').get()
  console.log(`Found ${snapshot.size} document(s) in "sales".`)

  // Back up the full collection before making any changes, so we can restore if needed.
  const backup = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }))
  const backupPath = `./sales-backup-${Date.now()}.json`
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`Backup written to ${backupPath}\n`)

  let migrated = 0
  let skipped = 0
  const batch = db.batch()

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const buyer = data.buyer

    if (!buyer || buyer.rut === undefined) {
      skipped++
      continue
    }

    console.log(`- ${docSnap.id}: buyer.rut = ${JSON.stringify(buyer.rut)} -> buyer.idNumber`)

    if (!DRY_RUN) {
      batch.update(docSnap.ref, {
        'buyer.idNumber': buyer.rut,
        'buyer.rut': FieldValue.delete(),
      })
    }
    migrated++
  }

  if (!DRY_RUN && migrated > 0) {
    await batch.commit()
  }

  console.log(`\nDone. ${migrated} document(s) migrated, ${skipped} document(s) skipped (no buyer.rut field).`)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
