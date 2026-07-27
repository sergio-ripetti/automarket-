// Canonical timestamp normalization and sorting shared by the backend (server.js, plain ESM)
// and the frontend (imported from .ts files - see timestampUtils.d.ts). Exists because Firestore
// documents in this project carry createdAt in several shapes depending on when/how they were
// written: real Firestore Timestamp instances, JSON-serialized {_seconds,_nanoseconds} objects
// (after crossing the HTTP boundary), native Date, ISO strings, and - for a handful of legacy
// records - an unresolved client-SDK serverTimestamp() sentinel object ({_methodName:
// "serverTimestamp"}) that never got replaced with a real timestamp. Firestore's own
// `.orderBy('createdAt', 'desc')` sorts by its internal cross-type value ordering, which does not
// place these malformed records at the end the way an admin list needs - hence this defensive,
// application-level normalization + stable sort layer.

// Converts any of the supported createdAt representations into epoch milliseconds, or null if the
// value is missing, unparseable, or an unresolved serverTimestamp() sentinel.
export function toEpochMillis(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }

  if (typeof value === 'object') {
    // Real Firestore Timestamp instance (Admin SDK or client SDK) - has toMillis()/toDate()
    if (typeof value.toMillis === 'function') {
      try {
        const t = value.toMillis();
        return Number.isFinite(t) ? t : null;
      } catch {
        return null;
      }
    }
    if (typeof value.toDate === 'function') {
      try {
        const t = value.toDate().getTime();
        return Number.isFinite(t) ? t : null;
      } catch {
        return null;
      }
    }

    // JSON-serialized Firestore Timestamp shape (after crossing an HTTP boundary)
    const seconds = value._seconds ?? value.seconds;
    const nanoseconds = value._nanoseconds ?? value.nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      return seconds * 1000 + Math.floor(nanoseconds / 1e6);
    }

    // Anything else - including the unresolved serverTimestamp() sentinel
    // { _methodName: 'serverTimestamp' } - is not a usable timestamp.
    return null;
  }

  return null;
}

// Stable comparator: newest first (descending). Records with a missing/invalid createdAt always
// sort after every record with a valid one; among two invalid records, original order is preserved.
export function compareByCreatedAtDesc(a, b) {
  const ta = toEpochMillis(a && a.createdAt);
  const tb = toEpochMillis(b && b.createdAt);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}

// Array.prototype.sort is a stable sort in all currently supported JS engines (spec-guaranteed
// since ES2019), so equal/invalid timestamps preserve their original relative order.
export function sortByCreatedAtDesc(items) {
  return [...items].sort(compareByCreatedAtDesc);
}
