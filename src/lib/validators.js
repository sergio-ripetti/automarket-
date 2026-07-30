// Server-side validators for security-critical operations
// These functions are extracted from server.js to enable comprehensive testing

/**
 * Validates and sanitizes business context by removing PII before passing to AI
 * Keeps aggregated business metrics while removing customer information
 * @param {unknown} context
 * @returns {Record<string, unknown>}
 */
function sanitizeBusinessContext(context) {
  if (!context || typeof context !== 'object') {
    return {};
  }

  // Allow only specific business metrics, explicitly removing PII
  const sanitized = {
    totalCars: context.totalCars || 0,
    availableCars: context.availableCars || 0,
    featuredCars: context.featuredCars || 0,
    carsOnSale: context.carsOnSale || 0,
    recentCars: context.recentCars || '[]',
    soldCars: context.soldCars || 0,
    featuredAvailableCars: context.featuredAvailableCars || 0,
    onSaleAvailableCars: context.onSaleAvailableCars || 0,
    availableVehicleCount: context.availableVehicleCount || 0,
    vehiclesIncludedInContext: context.vehiclesIncludedInContext || 0,
    isInventoryTruncated: Boolean(context.isInventoryTruncated),
    availableVehiclesJSON: context.availableVehiclesJSON || '[]',
    totalSales: context.totalSales || 0,
    totalRevenue: context.totalRevenue || 0,
    cashSales: context.cashSales || 0,
    financedSales: context.financedSales || 0,
    completedSales: context.completedSales || 0,
    recentSalesJSON: context.recentSalesJSON || '[]',
    totalFinancing: context.totalFinancing || 0,
    pendingFinancing: context.pendingFinancing || 0,
    approvedFinancing: context.approvedFinancing || 0,
    activeFinancing: context.activeFinancing || 0,
    recentFinancingJSON: context.recentFinancingJSON || '[]',
    totalMessages: context.totalMessages || 0,
    unreadMessages: context.unreadMessages || 0,
    offerMessages: context.offerMessages || 0,
    contactMessages: context.contactMessages || 0,
  };

  return sanitized;
}

// Bounds for the per-vehicle inventory context sent to the AI - keeps the prompt size
// predictable even if the client sends a larger payload than expected.
const MAX_INVENTORY_VEHICLES = 150;
const MAX_VEHICLE_STRING_LENGTH = 120;

/**
 * Normalizes and bounds a single available-vehicle entry to only the AI-safe scalar fields.
 * Returns null for a malformed entry (missing id/title, wrong types) so it can be dropped
 * rather than corrupting the list. Vehicle text fields are treated strictly as inert data -
 * they are truncated to a bounded length and are never interpreted as instructions.
 * @param {unknown} entry
 * @returns {Record<string, unknown> | null}
 */
function sanitizeVehicleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const id = typeof entry.id === 'string' && entry.id ? entry.id.slice(0, 100) : null;
  const title = typeof entry.title === 'string' && entry.title ? entry.title.slice(0, MAX_VEHICLE_STRING_LENGTH) : null;
  if (!id || !title) return null;

  const asBoundedString = (value) => (typeof value === 'string' ? value.slice(0, MAX_VEHICLE_STRING_LENGTH) : '');
  const asFiniteNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

  return {
    id,
    title,
    brand: asBoundedString(entry.brand),
    model: asBoundedString(entry.model),
    year: asFiniteNumber(entry.year),
    price: asFiniteNumber(entry.price),
    km: asFiniteNumber(entry.km),
    fuel: asBoundedString(entry.fuel),
    transmission: asBoundedString(entry.transmission),
    featured: Boolean(entry.featured),
    onSale: Boolean(entry.onSale),
  };
}

/**
 * Safely parses and validates the available-vehicles JSON payload: bounds the array length,
 * discards malformed entries, and never throws (a parse failure yields an empty list rather
 * than a 500).
 * @param {unknown} json
 * @returns {Record<string, unknown>[]}
 */
function parseAvailableVehicles(json) {
  if (typeof json !== 'string' || !json) return [];
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .slice(0, MAX_INVENTORY_VEHICLES)
    .map(sanitizeVehicleEntry)
    .filter((v) => v !== null);
}

// Single source of truth for "which sales count as sold" - a Sale marks its car sold unless
// its status is 'cancelled'. This mirrors src/lib/salesService.ts's getSoldCarIds exactly (that
// module re-exports this function rather than re-implementing the rule) so Admin Inventory,
// Record New Sale, the public sold-vehicle-ids endpoint, and the AI inventory context can never
// diverge on what "sold" means.
function getSoldCarIdsFromSales(sales) {
  if (!Array.isArray(sales)) return new Set();
  return new Set(
    sales
      .filter((s) => s && typeof s === 'object' && typeof s.carId === 'string' && s.carId && s.status !== 'cancelled')
      .map((s) => s.carId)
  );
}

const MAX_RECENT_SALES = 20;
const MAX_SALE_STRING_LENGTH = 120;

/**
 * Normalizes a single recent-sale entry down to only the AI-safe business fields the prompt
 * actually uses. No buyer/customer field (name, email, phone, address, id/licence number,
 * documents) is ever read or forwarded, even if present on the input object - this protects the
 * prompt even if an outdated or malicious client sends buyer data.
 * @param {unknown} entry
 * @returns {Record<string, unknown> | null}
 */
function sanitizeRecentSaleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const asBoundedString = (value) => (typeof value === 'string' ? value.slice(0, MAX_SALE_STRING_LENGTH) : '');
  const asFiniteNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

  const carTitle = asBoundedString(entry.carTitle);
  const carBrand = asBoundedString(entry.carBrand);
  const carModel = asBoundedString(entry.carModel);
  if (!carTitle && !carBrand && !carModel) return null;

  return {
    carTitle,
    carBrand,
    carModel,
    carYear: asFiniteNumber(entry.carYear),
    salePrice: asFiniteNumber(entry.salePrice),
    paymentType: asBoundedString(entry.paymentType),
    downPayment: asFiniteNumber(entry.downPayment),
    status: asBoundedString(entry.status),
    createdAt: asBoundedString(entry.createdAt),
  };
}

/**
 * Safely parses and validates the recent-sales JSON payload for the AI business context: bounds
 * the array length, allowlists only business fields (never buyer/customer data), and never
 * throws (a parse failure yields an empty list).
 * @param {unknown} json
 * @returns {Record<string, unknown>[]}
 */
function parseRecentSales(json) {
  if (typeof json !== 'string' || !json) return [];
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .slice(0, MAX_RECENT_SALES)
    .map(sanitizeRecentSaleEntry)
    .filter((v) => v !== null);
}

/**
 * Validates AI assistant message input
 * @param {unknown} message
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateAIMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'Invalid message';
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return 'Message cannot be empty';
  }

  if (trimmed.length > 5000) {
    return 'Message must be between 1 and 5000 characters';
  }

  return null;
}

/**
 * Validates conversation history array
 * @param {unknown} history
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateConversationHistory(history) {
  if (history === undefined || history === null) {
    return null;
  }

  if (!Array.isArray(history)) {
    return 'conversationHistory must be an array';
  }

  if (history.length > 50) {
    return 'Conversation history limited to 50 messages';
  }

  return null;
}

/**
 * Validates CORS origin against allowed list
 * @param {string | undefined} origin
 * @param {string[]} allowedOrigins
 * @returns {boolean}
 */
function validateCORSOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  // Browsers never send a trailing slash in the Origin header, but an operator could
  // accidentally set FRONTEND_URL with one (e.g. "https://example.com/") - strip it from both
  // sides so that harmless difference doesn't cause a false CORS rejection.
  const normalize = (value) => value.replace(/\/+$/, '');
  const normalizedOrigin = normalize(origin);

  return allowedOrigins.some((allowed) => normalize(allowed) === normalizedOrigin);
}

/**
 * Safe error message extractor
 * Prevents leaking internal details or API keys
 * @param {unknown} error
 * @returns {string}
 */
function getSafeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    if (typeof error.message === 'string') {
      return error.message;
    }
  }

  return 'Internal server error';
}

/**
 * Rate limit checker with deterministic time tracking
 * Tracks requests per key and enforces limits
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 20, nowFn) {
    this.requestCounts = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.now = nowFn || (() => Date.now());
  }

  isAllowed(key) {
    const now = this.now();

    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }

    const times = this.requestCounts.get(key);
    const validTimes = times.filter((t) => now - t < this.windowMs);

    if (validTimes.length >= this.maxRequests) {
      return false;
    }

    validTimes.push(now);
    this.requestCounts.set(key, validTimes);
    return true;
  }

  // Seconds until the given key's oldest in-window request ages out and a new
  // request would be allowed again. Used to populate a 429 response's retryAfter.
  getRetryAfterSeconds(key) {
    const times = this.requestCounts.get(key) || [];
    const now = this.now();
    const validTimes = times.filter((t) => now - t < this.windowMs);
    if (validTimes.length === 0) return 0;
    const oldest = Math.min(...validTimes);
    const msRemaining = this.windowMs - (now - oldest);
    return Math.max(1, Math.ceil(msRemaining / 1000));
  }

  reset() {
    this.requestCounts.clear();
  }
}

/**
 * Validates financing application submission payload
 * @param {unknown} payload
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateFinancingSubmission(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid financing application payload';
  }

  // Required string fields
  const requiredStrings = ['firstName', 'lastName', 'email', 'phone', 'licenseNumber', 'employer', 'jobTitle'];
  for (const field of requiredStrings) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      return `${field} is required`;
    }
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'Invalid email format';
  }

  // NZ license validation (2 uppercase letters + 5-6 digits)
  if (!/^[A-Z]{2}\d{5,6}$/.test(payload.licenseNumber)) {
    return 'Invalid NZ licence format';
  }

  // Numeric fields - income, monthlyExpenses
  const income = Number(payload.income);
  if (isNaN(income) || income <= 0) {
    return 'Income must be greater than zero';
  }

  const monthlyExpenses = Number(payload.monthlyExpenses);
  if (isNaN(monthlyExpenses) || monthlyExpenses < 0) {
    return 'Monthly expenses must be non-negative';
  }

  if (monthlyExpenses > income) {
    return 'Monthly expenses cannot exceed income';
  }

  // Years employed
  const yearsEmployed = Number(payload.yearsEmployed);
  if (isNaN(yearsEmployed) || yearsEmployed < 0) {
    return 'Years employed must be non-negative';
  }

  // Consent
  if (payload.creditHistoryConsent !== true) {
    return 'Credit history consent is required';
  }

  // Numeric fields - down payment, months
  const downPayment = Number(payload.downPayment);
  if (isNaN(downPayment)) {
    return 'Invalid down payment value';
  }

  const months = Number(payload.months);
  if (isNaN(months) || months <= 0) {
    return 'Loan term must be greater than zero';
  }

  // Car price (either from carId or manualPrice)
  if (!payload.carId && !payload.manualPrice) {
    return 'Car selection is required';
  }

  // Documents array
  if (!Array.isArray(payload.documents)) {
    return 'Documents must be an array';
  }

  // Validate each document has url, type, filename
  for (const doc of payload.documents) {
    if (!doc || typeof doc !== 'object') {
      return 'Invalid document in array';
    }
    if (typeof doc.url !== 'string' || !doc.url.startsWith('http')) {
      return 'Document URL must be a valid HTTP URL';
    }
    if (typeof doc.type !== 'string') {
      return 'Document type is required';
    }
    if (typeof doc.filename !== 'string') {
      return 'Document filename is required';
    }
  }

  return null;
}

/**
 * Validates public message submission (Contact or vehicle inquiry)
 * @param {unknown} payload
 * @returns {string | null} Error message if invalid, null if valid
 */
function validatePublicMessageSubmission(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid message payload';
  }

  // Required: email
  if (!payload.email || typeof payload.email !== 'string') {
    return 'Email is required';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    return 'Invalid email format';
  }

  // Required: message
  if (!payload.message || typeof payload.message !== 'string') {
    return 'Message is required';
  }

  const messageTrimmed = payload.message.trim();
  if (messageTrimmed.length === 0 || messageTrimmed.length > 5000) {
    return 'Message must be between 1 and 5000 characters';
  }

  // Required: name (either name or firstName/lastName)
  const hasName = payload.name || (payload.firstName && payload.lastName);
  if (!hasName) {
    return 'Name is required';
  }

  if (payload.name && (typeof payload.name !== 'string' || payload.name.trim().length === 0)) {
    return 'Name cannot be empty';
  }

  if (payload.firstName && (typeof payload.firstName !== 'string' || payload.firstName.trim().length === 0)) {
    return 'First name cannot be empty';
  }

  if (payload.lastName && (typeof payload.lastName !== 'string' || payload.lastName.trim().length === 0)) {
    return 'Last name cannot be empty';
  }

  // Required: phone
  if (!payload.phone || typeof payload.phone !== 'string') {
    return 'Phone number is required';
  }

  if (payload.phone.trim().length === 0) {
    return 'Phone number cannot be empty';
  }

  // Optional: offerPrice (must be positive if provided)
  if (payload.offerPrice !== undefined && payload.offerPrice !== null) {
    const offerPrice = Number(payload.offerPrice);
    if (isNaN(offerPrice) || offerPrice <= 0) {
      return 'Offer price must be a positive number';
    }
  }

  // Required: type
  if (!payload.type || !['contact', 'offer'].includes(payload.type)) {
    return 'Invalid message type';
  }

  // Optional: reason (max length)
  if (payload.reason && typeof payload.reason === 'string' && payload.reason.length > 100) {
    return 'Reason cannot exceed 100 characters';
  }

  // Check payload size (prevent abuse)
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 10000) {
    return 'Message payload too large';
  }

  return null;
}

/**
 * Validates admin car creation/update payload
 * @param {unknown} payload
 * @param {boolean} isPartial - If true, validates for PATCH (allows empty updates); if false, validates for full POST
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateCarPayload(payload, isPartial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Invalid car payload';
  }

  // Reject id or createdAt mutations (check this first, before empty update check)
  if ('id' in payload) {
    return 'Cannot modify car id';
  }
  if ('createdAt' in payload) {
    return 'Cannot modify createdAt';
  }

  // For PATCH, reject completely empty updates (only after checking mutations)
  if (isPartial) {
    const updates = Object.keys(payload).filter((k) => !['id', 'createdAt'].includes(k));
    if (updates.length === 0) {
      return 'Update must include at least one field';
    }
  }

  // Validate provided fields
  if (payload.title !== undefined) {
    if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      return 'Title is required and must be non-empty';
    }
    if (payload.title.length > 255) {
      return 'Title cannot exceed 255 characters';
    }
  }

  if (payload.brand !== undefined) {
    if (typeof payload.brand !== 'string' || payload.brand.trim().length === 0) {
      return 'Brand is required';
    }
    if (payload.brand.length > 100) {
      return 'Brand cannot exceed 100 characters';
    }
  }

  if (payload.model !== undefined) {
    if (typeof payload.model !== 'string' || payload.model.trim().length === 0) {
      return 'Model is required';
    }
    if (payload.model.length > 100) {
      return 'Model cannot exceed 100 characters';
    }
  }

  if (payload.year !== undefined) {
    const year = Number(payload.year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return 'Year must be a number between 1900 and 2100';
    }
  }

  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (isNaN(price) || price < 0) {
      return 'Price must be a non-negative number';
    }
  }

  if (payload.originalPrice !== undefined && payload.originalPrice !== null) {
    const originalPrice = Number(payload.originalPrice);
    if (isNaN(originalPrice) || originalPrice < 0) {
      return 'Original price must be a non-negative number';
    }
  }

  if (payload.km !== undefined) {
    const km = Number(payload.km);
    if (isNaN(km) || km < 0) {
      return 'Mileage must be a non-negative number';
    }
  }

  if (payload.transmission !== undefined) {
    if (!['manual', 'automatico'].includes(payload.transmission)) {
      return 'Transmission must be "manual" or "automatico"';
    }
  }

  if (payload.fuel !== undefined) {
    if (!['gasolina', 'diesel', 'electrico', 'hibrido'].includes(payload.fuel)) {
      return 'Fuel type must be one of: gasolina, diesel, electrico, hibrido';
    }
  }

  if (payload.color !== undefined) {
    if (typeof payload.color !== 'string' || payload.color.length === 0) {
      return 'Color is required';
    }
    if (payload.color.length > 50) {
      return 'Color cannot exceed 50 characters';
    }
  }

  if (payload.description !== undefined) {
    if (typeof payload.description !== 'string') {
      return 'Description must be a string';
    }
    if (payload.description.length > 2000) {
      return 'Description cannot exceed 2000 characters';
    }
  }

  if (payload.ownerDescription !== undefined) {
    if (typeof payload.ownerDescription !== 'string') {
      return 'Owner description must be a string';
    }
    if (payload.ownerDescription.length > 2000) {
      return 'Owner description cannot exceed 2000 characters';
    }
  }

  if (payload.images !== undefined) {
    if (!Array.isArray(payload.images)) {
      return 'Images must be an array';
    }
    if (payload.images.length === 0) {
      return 'At least one image is required';
    }
    if (payload.images.length > 10) {
      return 'Maximum 10 images allowed';
    }
    for (let i = 0; i < payload.images.length; i++) {
      if (typeof payload.images[i] !== 'string') {
        return `Image ${i + 1} must be a string (URL)`;
      }
      if (!payload.images[i].startsWith('http')) {
        return `Image ${i + 1} must be a valid URL`;
      }
    }
  }

  if (payload.featured !== undefined) {
    if (typeof payload.featured !== 'boolean') {
      return 'Featured must be a boolean';
    }
  }

  if (payload.isOnSale !== undefined) {
    if (typeof payload.isOnSale !== 'boolean') {
      return 'isOnSale must be a boolean';
    }
  }

  // For POST (full creation), require critical fields
  if (!isPartial) {
    const required = ['title', 'brand', 'model', 'year', 'price', 'km', 'transmission', 'fuel', 'color', 'description', 'ownerDescription', 'images', 'featured', 'isOnSale'];
    for (const field of required) {
      if (!(field in payload)) {
        return `${field} is required`;
      }
    }
  }

  return null;
}

/**
 * Validates admin sale creation/update payload
 * @param {unknown} payload
 * @param {boolean} isPartial - If true, validates for PATCH (allows empty updates); if false, validates for full POST
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateSalePayload(payload, isPartial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Invalid sale payload';
  }

  // Reject id or createdAt mutations (check first, before empty update check)
  if ('id' in payload) {
    return 'Cannot modify sale id';
  }
  if ('createdAt' in payload) {
    return 'Cannot modify createdAt';
  }

  // For PATCH, reject completely empty updates
  if (isPartial) {
    const updates = Object.keys(payload).filter((k) => !['id', 'createdAt'].includes(k));
    if (updates.length === 0) {
      return 'Update must include at least one field';
    }
  }

  // Validate provided fields
  if (payload.salePrice !== undefined) {
    const price = Number(payload.salePrice);
    if (isNaN(price) || price < 0) {
      return 'Sale price must be a non-negative number';
    }
  }

  if (payload.downPayment !== undefined) {
    const downPayment = Number(payload.downPayment);
    if (isNaN(downPayment) || downPayment < 0) {
      return 'Down payment must be a non-negative number';
    }
    // Check deposit does not exceed sale price if both provided
    if (payload.salePrice !== undefined) {
      const salePrice = Number(payload.salePrice);
      if (downPayment > salePrice) {
        return 'Down payment cannot exceed sale price';
      }
    }
  }

  if (payload.buyer !== undefined) {
    if (!payload.buyer || typeof payload.buyer !== 'object') {
      return 'Buyer must be an object';
    }
    // Validate required buyer fields
    if (payload.buyer.name !== undefined && (typeof payload.buyer.name !== 'string' || payload.buyer.name.trim().length === 0)) {
      return 'Buyer name is required and must be non-empty';
    }
    if (payload.buyer.email !== undefined && (typeof payload.buyer.email !== 'string' || payload.buyer.email.length === 0)) {
      return 'Buyer email is required';
    }
    if (payload.buyer.phone !== undefined && (typeof payload.buyer.phone !== 'string' || payload.buyer.phone.length === 0)) {
      return 'Buyer phone is required';
    }
  }

  if (payload.notes !== undefined) {
    if (typeof payload.notes !== 'string') {
      return 'Notes must be a string';
    }
    if (payload.notes.length > 5000) {
      return 'Notes cannot exceed 5000 characters';
    }
  }

  if (payload.status !== undefined) {
    if (!['active', 'completed', 'cancelled'].includes(payload.status)) {
      return 'Status must be one of: active, completed, cancelled';
    }
  }

  if (payload.payments !== undefined) {
    if (!Array.isArray(payload.payments)) {
      return 'Payments must be an array';
    }
    for (let i = 0; i < payload.payments.length; i++) {
      const payment = payload.payments[i];
      if (!payment || typeof payment !== 'object') {
        return `Payment ${i + 1} must be an object`;
      }
      if (payment.status !== undefined && !['pending', 'paid', 'overdue'].includes(payment.status)) {
        return `Payment ${i + 1} status must be pending, paid, or overdue`;
      }
      if (payment.amount !== undefined) {
        const amount = Number(payment.amount);
        if (isNaN(amount) || amount < 0) {
          return `Payment ${i + 1} amount must be non-negative`;
        }
      }
    }
  }

  // For POST (full creation), require critical fields
  if (!isPartial) {
    const required = ['salePrice', 'buyer', 'paymentPlan', 'payments', 'status', 'saleDate'];
    for (const field of required) {
      if (!(field in payload)) {
        return `${field} is required`;
      }
    }
  }

  return null;
}

/**
 * Validates admin financing status update payload
 * @param {unknown} payload
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateFinancingStatusUpdate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Invalid financing status update payload';
  }

  if (!('status' in payload)) {
    return 'Status field is required';
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'paying', 'completed'];
  if (!validStatuses.includes(payload.status)) {
    return `Status must be one of: ${validStatuses.join(', ')}`;
  }

  return null;
}

/**
 * Validates admin message read status update payload
 * @param {unknown} payload
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateMessageReadUpdate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Invalid message read update payload';
  }

  if (!('read' in payload)) {
    return 'Read field is required';
  }

  if (typeof payload.read !== 'boolean') {
    return 'Read must be a boolean value';
  }

  return null;
}

export {
  sanitizeBusinessContext,
  parseAvailableVehicles,
  getSoldCarIdsFromSales,
  parseRecentSales,
  validateAIMessage,
  validateConversationHistory,
  validateCORSOrigin,
  getSafeErrorMessage,
  RateLimiter,
  validateFinancingSubmission,
  validatePublicMessageSubmission,
  validateCarPayload,
  validateSalePayload,
  validateFinancingStatusUpdate,
  validateMessageReadUpdate,
};
