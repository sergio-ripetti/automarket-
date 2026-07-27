// Probes whether a stored document URL (Cloudinary or otherwise) is actually retrievable.
// Needed because a successful upload response does not guarantee delivery: Cloudinary can
// return 200 + a valid secure_url at upload time while still blocking delivery of that same
// URL (e.g. the account-level "PDF and ZIP delivery" restriction), which otherwise surfaces
// to users as a silently broken View/Download link with no explanation.
export async function checkFileAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' })
    return response.ok
  } catch {
    return false
  }
}
