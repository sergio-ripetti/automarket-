import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { initializeFirebaseAdmin, getAdminFirestore, savePublicMessage, createCarAdmin, updateCarAdmin, deleteCarAdmin, createSaleAdmin, updateSaleAdmin, updateSalePaymentAndStatusAdmin, deleteSaleAdmin, updateFinancingStatusAdmin, deleteFinancingApplicationAdmin, updateMessageReadStatusAdmin, deleteMessageAdmin } from './src/lib/firebaseAdmin.js';
import {
  authenticate,
  requireAdmin,
} from './src/lib/authMiddleware.js';
import {
  sanitizeBusinessContext,
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
} from './src/lib/validators.js';
import { saveFinancingApplication } from './src/lib/firebaseAdmin.js';
import { sortByCreatedAtDesc } from './src/lib/timestampUtils.js';

dotenv.config();

// Initialize Firebase Admin SDK for token verification
initializeFirebaseAdmin();

const app = express();
const PORT = 3001;

// CORS configuration - allow only trusted frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'https://automarket-ten.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (validateCORSOrigin(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: false,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Diagnostics
console.log('🔧 Environment Variables Check:');
console.log('  - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Loaded' : '❌ Missing');
console.log('  - Firebase Admin SDK:', process.env.FIREBASE_ADMIN_SDK_DISABLED ? '⚠️ Disabled' : '✓ Initialized');

// Initialize Anthropic client
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

if (!anthropicKey) {
  console.error('❌ ANTHROPIC_API_KEY not configured');
  console.error('   Please ensure .env file has ANTHROPIC_API_KEY set');
  process.exit(1);
}

// Cloudinary Admin API - required to delete Sales documents/photos when removed in Edit Sale.
// Deletion is skipped gracefully (with a clear error) when credentials aren't configured,
// rather than silently pretending the remote file was removed.
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlfgvbtzz',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('⚠️ CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET not configured - Cloudinary file deletion will not work');
}

const client = new Anthropic({ apiKey: anthropicKey });

// Rate limiting with RateLimiter class from validators
const rateLimiter = new RateLimiter(60000, 20);

// Rate limiting middleware - tracks requests per user UID
const rateLimit = (req, res, next) => {
  const key = req.user?.uid || req.ip;
  if (!rateLimiter.isAllowed(key)) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded - maximum 20 requests per minute' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/aiAssistant - Authenticated admin only. Takes a chat message plus business context/history from the client, builds a system prompt with live business data, and forwards the conversation to the Anthropic Claude API
app.post('/api/aiAssistant', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { message, businessContext, conversationHistory } = req.body;

    // Validate message using validator from validators.js
    const messageError = validateAIMessage(message);
    if (messageError) {
      return res.status(400).json({ success: false, error: messageError });
    }

    // Validate conversation history if provided using validator from validators.js
    const historyError = validateConversationHistory(conversationHistory);
    if (historyError) {
      return res.status(400).json({ success: false, error: historyError });
    }

    // Sanitize business context to remove PII using validator from validators.js
    const sanitized = sanitizeBusinessContext(businessContext);

    // Build system prompt with sanitized business context
    let systemPrompt = 'Eres un asistente de IA para AutoMarket, un mercado automotriz. Tienes acceso COMPLETO a todos los datos del negocio.';

    systemPrompt += `\n\n=== DATOS DEL NEGOCIO ===\n`;
    systemPrompt += `Total de autos: ${sanitized.totalCars || 0} (${sanitized.availableCars || 0} disponibles)\n`;
    systemPrompt += `Ventas totales: ${sanitized.totalSales || 0}, Ingresos: $${sanitized.totalRevenue || 0}\n`;
    systemPrompt += `Financiamiento: ${sanitized.totalFinancing || 0}\n`;
    systemPrompt += `Mensajes: ${sanitized.totalMessages || 0}\n`;

    // Include recent sales data if available (PII already removed by sanitizeBusinessContext)
    if (sanitized.recentSalesJSON) {
      try {
        const recentSales = JSON.parse(sanitized.recentSalesJSON);
        if (recentSales.length > 0) {
          systemPrompt += `\n=== RECENT SALES SUMMARY ===\n`;
          recentSales.forEach((sale, idx) => {
            systemPrompt += `${idx + 1}. ${sale.carBrand} ${sale.carModel} (${sale.carYear}) - $${sale.salePrice || 0} NZD\n`;
          });
        }
      } catch (e) {
        // Skip if parsing fails
      }
    }

    systemPrompt += `\n\nRespond in the same language the user is writing in. Be concise and specific.`;

    // Build messages array with conversation history
    let messages = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages = conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    messages.push({ role: 'user', content: message });

    // Call Anthropic API
    console.log('📤 Calling Anthropic API with:');
    console.log('   Model: claude-opus-4-8');
    console.log('   Messages:', messages.length);
    console.log('   Max tokens: 1024');

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system: systemPrompt,
        messages
      });
      console.log('✅ Anthropic API responded');
    } catch (apiError) {
      console.error('❌ Anthropic API Error:', apiError.message);
      throw apiError;
    }

    // Extract reply from response
    let reply = '';
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      reply = response.content[0].text;
      console.log('📝 Reply extracted:', reply.substring(0, 50) + '...');
    } else {
      console.warn('⚠️ No text content in response:', response.content);
    }

    if (!reply) {
      console.warn('⚠️ Empty reply, returning default message');
      reply = 'I received your message but could not generate a response.';
    }

    console.log('📤 Sending response:', { reply: reply.substring(0, 30) + '...', success: true });
    res.json({ reply, success: true });

  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Error:', safeMessage);
    res.status(500).json({
      success: false,
      error: safeMessage
    });
  }
});

// ============================================================================
// Financing Calculations (server-side verification)
// ============================================================================
const FINANCING_MONTHLY_RATE = 0.008;

function calculateDownPaymentAmount(basePrice, downPaymentPercentage) {
  return Math.round((downPaymentPercentage / 100) * basePrice);
}

function calculateFinancedAmount(basePrice, downPaymentAmount) {
  return basePrice - downPaymentAmount;
}

function calculateMonthlyPayment(financedAmount, loanTermMonths) {
  if (financedAmount <= 0 || loanTermMonths <= 0) {
    return 0;
  }
  const r = FINANCING_MONTHLY_RATE;
  const n = loanTermMonths;
  const numerator = r * Math.pow(1 + r, n);
  const denominator = Math.pow(1 + r, n) - 1;
  return financedAmount * (numerator / denominator);
}

function calculateTotalRepayment(monthlyPayment, loanTermMonths, downPaymentAmount) {
  return monthlyPayment * loanTermMonths + downPaymentAmount;
}

function calculateTotalInterest(totalRepayment, basePrice) {
  return totalRepayment - basePrice;
}

function calculateBasePrice(carPrice, manualPrice) {
  if (carPrice !== undefined && carPrice > 0) {
    return carPrice;
  }
  const parsed = Number(manualPrice);
  return parsed > 0 ? parsed : 25000;
}

// POST /api/financing/submit - Public endpoint for financing application submission
// Validates all fields server-side, recalculates finances, and writes to Firestore via Admin SDK
app.post('/api/financing/submit', rateLimit, async (req, res) => {
  try {
    const payload = req.body;

    // Validate financing submission
    const validationError = validateFinancingSubmission(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Extract and parse values
    const firstName = payload.firstName.trim();
    const lastName = payload.lastName.trim();
    const email = payload.email.trim();
    const phone = payload.phone.trim();
    const licenseNumber = payload.licenseNumber.toUpperCase().trim();
    const income = Number(payload.income);
    const monthlyExpenses = Number(payload.monthlyExpenses);
    const yearsEmployed = Number(payload.yearsEmployed);
    const downPaymentPercent = Number(payload.downPayment);
    const loanTermMonths = Number(payload.months);
    const employer = payload.employer.trim();
    const jobTitle = payload.jobTitle.trim();
    const employmentType = payload.employmentType || 'fulltime';
    const creditHistoryConsent = payload.creditHistoryConsent === true;
    const documents = Array.isArray(payload.documents) ? payload.documents : [];

    // Determine base price (ignore client-calculated totals)
    const carPrice = payload.carPrice ? Number(payload.carPrice) : undefined;
    const manualPrice = payload.manualPrice || '25000';
    const basePrice = calculateBasePrice(carPrice, manualPrice);

    // Recalculate all financing values server-side (ignore client values)
    const downPaymentAmount = calculateDownPaymentAmount(basePrice, downPaymentPercent);
    const financedAmount = calculateFinancedAmount(basePrice, downPaymentAmount);
    const monthlyPayment = Math.round(calculateMonthlyPayment(financedAmount, loanTermMonths));
    const totalRepayment = calculateTotalRepayment(monthlyPayment, loanTermMonths, downPaymentAmount);
    const totalInterest = Math.round(calculateTotalInterest(totalRepayment, basePrice));

    // Prepare Firestore document
    const financingData = {
      carId: payload.carId || 'manual',
      carTitle: payload.carTitle || `Manual Entry - $${basePrice}`,
      firstName,
      lastName,
      email,
      phone,
      licenseNumber,
      monthlyIncome: income,
      downPayment: downPaymentAmount,
      loanTerm: loanTermMonths,
      monthlyPayment,
      totalAmount: financedAmount,
      totalInterest,
      employer,
      jobTitle,
      employmentType,
      yearsEmployed,
      monthlyExpenses,
      documents,
      creditHistoryConsent,
      status: 'pending',
      createdAt: new Date(),
    };

    // Save to Firestore using Admin SDK (bypasses client-side security rules)
    const docId = await saveFinancingApplication(financingData);

    // Return minimal success response
    res.json({
      success: true,
      applicationId: docId,
    });

  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Financing submission error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to submit financing application',
    });
  }
});

// GET /api/financing/applications - Admin-only endpoint to fetch financing applications
// Requires Firebase authentication and admin authorization
app.get('/api/financing/applications', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const db = getAdminFirestore();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Firestore service unavailable',
      });
    }

    const snapshot = await db
      .collection('financing')
      .orderBy('createdAt', 'desc')
      .get();

    const applications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Defensive application-level sort on top of Firestore's own orderBy: a handful of legacy
    // documents carry createdAt as a malformed object (an unresolved client-SDK serverTimestamp()
    // sentinel) rather than a real Timestamp, which Firestore's cross-type value ordering does not
    // reliably place last. This guarantees newest-first regardless of that legacy data.
    const sortedApplications = sortByCreatedAtDesc(applications);

    res.json({
      success: true,
      applications: sortedApplications,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Financing applications fetch error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financing applications',
    });
  }
});

// PATCH /api/financing/:id/status - Admin-only endpoint to update financing application status
// Requires Firebase authentication and admin authorization
app.patch('/api/financing/:id/status', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    // Validate status update payload
    const validationError = validateFinancingStatusUpdate(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Update financing status via Admin SDK
    await updateFinancingStatusAdmin(id, payload.status);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Financing status update error:', safeMessage);

    if (safeMessage.includes('not found') || safeMessage.includes('No document')) {
      return res.status(404).json({ success: false, error: 'Financing application not found' });
    }

    res.status(500).json({ success: false, error: 'Failed to update financing status' });
  }
});

// DELETE /api/financing/:id - Admin-only endpoint to delete a financing application
// Requires Firebase authentication and admin authorization
app.delete('/api/financing/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete financing application via Admin SDK
    await deleteFinancingApplicationAdmin(id);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Financing deletion error:', safeMessage);
    res.status(500).json({ success: false, error: 'Failed to delete financing application' });
  }
});

// POST /api/messages/submit - Public endpoint for contact form and vehicle inquiry submissions
// Public endpoint: no authentication required
// Rate limited to prevent abuse
app.post('/api/messages/submit', rateLimit, async (req, res) => {
  try {
    const payload = req.body;

    // Validate message submission
    const validationError = validatePublicMessageSubmission(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Sanitize string fields (trim whitespace)
    const sanitizedMessage = {
      type: payload.type,
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      message: payload.message.trim(),
      read: false,
      createdAt: new Date(),
    };

    // Contact form specific fields
    if (payload.type === 'contact') {
      sanitizedMessage.senderName = payload.name ? payload.name.trim() : '';
      sanitizedMessage.reason = payload.reason ? payload.reason.trim() : '';
    }

    // Vehicle inquiry/offer specific fields
    if (payload.type === 'offer') {
      const firstName = payload.firstName ? payload.firstName.trim() : '';
      const lastName = payload.lastName ? payload.lastName.trim() : '';
      sanitizedMessage.senderName = `${firstName} ${lastName}`.trim();
      sanitizedMessage.firstName = firstName;
      sanitizedMessage.lastName = lastName;
      sanitizedMessage.reason = 'Vehicle Offer';
      sanitizedMessage.message = payload.message ? payload.message.trim() : '';
      if (payload.offerPrice !== undefined) {
        sanitizedMessage.offerPrice = Number(payload.offerPrice);
      }
      if (payload.carId) sanitizedMessage.carId = payload.carId;
      if (payload.carTitle) sanitizedMessage.carTitle = payload.carTitle;
      if (payload.carPrice) sanitizedMessage.carPrice = payload.carPrice;
    }

    // Save to Firestore via Admin SDK (bypasses client-side security rules)
    const messageId = await savePublicMessage(sanitizedMessage);

    // Return minimal success response without PII
    res.json({
      success: true,
      messageId,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Message submission error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to submit message',
    });
  }
});

// PATCH /api/messages/:id/read - Admin-only endpoint to update message read status
// Requires Firebase authentication and admin authorization
app.patch('/api/messages/:id/read', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    // Validate read status update payload
    const validationError = validateMessageReadUpdate(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Update message read status via Admin SDK
    await updateMessageReadStatusAdmin(id, payload.read);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Message read status update error:', safeMessage);

    if (safeMessage.includes('not found') || safeMessage.includes('No document')) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.status(500).json({ success: false, error: 'Failed to update message status' });
  }
});

// DELETE /api/messages/:id - Admin-only endpoint to delete a message
// Requires Firebase authentication and admin authorization
app.delete('/api/messages/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete message via Admin SDK
    await deleteMessageAdmin(id);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Message deletion error:', safeMessage);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// ============================================================================
// Admin Car CRUD Endpoints
// ============================================================================

// POST /api/cars - Create a new vehicle (admin only)
app.post('/api/cars', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const payload = req.body;

    // Validate car payload
    const validationError = validateCarPayload(payload, false);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Sanitize and store
    const carData = {
      title: payload.title.trim(),
      brand: payload.brand.trim(),
      model: payload.model.trim(),
      year: Number(payload.year),
      price: Number(payload.price),
      km: Number(payload.km),
      transmission: payload.transmission,
      fuel: payload.fuel,
      color: payload.color.trim(),
      description: payload.description,
      ownerDescription: payload.ownerDescription,
      images: payload.images,
      featured: Boolean(payload.featured),
      isOnSale: Boolean(payload.isOnSale),
    };

    if (payload.originalPrice !== undefined && payload.originalPrice !== null) {
      carData.originalPrice = Number(payload.originalPrice);
    }

    const carId = await createCarAdmin(carData);

    res.status(201).json({
      success: true,
      id: carId,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Car creation error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to create vehicle',
    });
  }
});

// PATCH /api/cars/:id - Update an existing vehicle (admin only)
app.patch('/api/cars/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    // Validate partial update
    const validationError = validateCarPayload(payload, true);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Sanitize fields
    const updateData = {};
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.brand !== undefined) updateData.brand = payload.brand.trim();
    if (payload.model !== undefined) updateData.model = payload.model.trim();
    if (payload.year !== undefined) updateData.year = Number(payload.year);
    if (payload.price !== undefined) updateData.price = Number(payload.price);
    if (payload.originalPrice !== undefined) updateData.originalPrice = payload.originalPrice ? Number(payload.originalPrice) : null;
    if (payload.km !== undefined) updateData.km = Number(payload.km);
    if (payload.transmission !== undefined) updateData.transmission = payload.transmission;
    if (payload.fuel !== undefined) updateData.fuel = payload.fuel;
    if (payload.color !== undefined) updateData.color = payload.color.trim();
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.ownerDescription !== undefined) updateData.ownerDescription = payload.ownerDescription;
    if (payload.images !== undefined) updateData.images = payload.images;
    if (payload.featured !== undefined) updateData.featured = Boolean(payload.featured);
    if (payload.isOnSale !== undefined) updateData.isOnSale = Boolean(payload.isOnSale);

    await updateCarAdmin(id, updateData);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Car update error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to update vehicle',
    });
  }
});

// DELETE /api/cars/:id - Delete a vehicle (admin only)
app.delete('/api/cars/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    await deleteCarAdmin(id);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Car deletion error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vehicle',
    });
  }
});

// ============================================================================
// Admin Sales CRUD Endpoints
// ============================================================================

// POST /api/sales - Create a new sale (admin only)
app.post('/api/sales', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const payload = req.body;

    // Validate sale payload
    const validationError = validateSalePayload(payload, false);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Sanitize and store
    const saleData = {
      carId: payload.carId,
      carTitle: payload.carTitle,
      carBrand: payload.carBrand,
      carModel: payload.carModel,
      carYear: Number(payload.carYear),
      carColor: payload.carColor,
      carImages: payload.carImages,
      buyer: {
        name: payload.buyer.name.trim(),
        idNumber: payload.buyer.idNumber?.trim() || '',
        email: payload.buyer.email.trim(),
        phone: payload.buyer.phone.trim(),
        address: payload.buyer.address?.trim() || '',
        licenseNumber: payload.buyer.licenseNumber?.trim() || '',
      },
      paymentPlan: payload.paymentPlan,
      payments: payload.payments,
      status: payload.status,
      saleDate: payload.saleDate,
      notes: payload.notes?.trim() || '',
      vehicleInfo: payload.vehicleInfo,
      orc: payload.orc,
      extraAccessories: payload.extraAccessories,
    };

    if (payload.financingFees) saleData.financingFees = payload.financingFees;
    if (payload.warranty) saleData.warranty = payload.warranty;
    if (payload.mechanicalInsurance) saleData.mechanicalInsurance = payload.mechanicalInsurance;
    if (payload.documents) saleData.documents = payload.documents;

    const saleId = await createSaleAdmin(saleData);

    res.status(201).json({
      success: true,
      id: saleId,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Sale creation error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to create sale',
    });
  }
});

// PATCH /api/sales/:id - Update an existing sale (admin only)
app.patch('/api/sales/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    // Validate partial update
    const validationError = validateSalePayload(payload, true);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    // Sanitize fields
    const updateData = {};
    if (payload.buyer !== undefined) {
      updateData.buyer = {
        name: payload.buyer.name?.trim() || '',
        idNumber: payload.buyer.idNumber?.trim() || '',
        email: payload.buyer.email?.trim() || '',
        phone: payload.buyer.phone?.trim() || '',
        address: payload.buyer.address?.trim() || '',
        licenseNumber: payload.buyer.licenseNumber?.trim() || '',
      };
    }
    if (payload.paymentPlan !== undefined) updateData.paymentPlan = payload.paymentPlan;
    if (payload.payments !== undefined) updateData.payments = payload.payments;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.saleDate !== undefined) updateData.saleDate = payload.saleDate;
    if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() || '';
    if (payload.documents !== undefined) updateData.documents = payload.documents;
    if (payload.financingFees !== undefined) updateData.financingFees = payload.financingFees;

    await updateSaleAdmin(id, updateData);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Sale update error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to update sale',
    });
  }
});

// PATCH /api/sales/:id/payments/:paymentId - Mark payment paid/unpaid (admin only)
app.patch('/api/sales/:id/payments/:paymentId', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const payload = req.body;

    if (!payload.status || !['pending', 'paid', 'overdue'].includes(payload.status)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status' });
    }

    // Get current sale to access payments array
    const db = getAdminFirestore();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Firestore unavailable' });
    }

    const saleDoc = await db.collection('sales').doc(id).get();
    if (!saleDoc.exists) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    const sale = saleDoc.data();
    const payments = Array.isArray(sale.payments) ? [...sale.payments] : [];

    // Find and update the target payment
    let paymentFound = false;
    const updatedPayments = payments.map((p) => {
      if (p.id === paymentId) {
        paymentFound = true;
        if (payload.status === 'paid') {
          return { ...p, status: 'paid', paidDate: new Date().toISOString().split('T')[0] };
        } else {
          const { paidDate, ...rest } = p;
          return { ...rest, status: 'pending' };
        }
      }
      return p;
    });

    if (!paymentFound) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Determine new sale status
    let newStatus = sale.status;
    if (payload.status === 'paid') {
      const allPaymentsPaid = updatedPayments.every((p) => p.status === 'paid');
      if (allPaymentsPaid && sale.status !== 'completed') {
        newStatus = 'completed';
      }
    } else if (payload.status === 'pending') {
      if (sale.status === 'completed') {
        newStatus = 'active';
      }
    }

    // Update sale with new payments and status
    await updateSalePaymentAndStatusAdmin(id, {
      payments: updatedPayments,
      status: newStatus,
    });

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Payment update error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment',
    });
  }
});

// POST /api/cloudinary/delete - Delete a single Cloudinary asset (admin only)
// Used when a Sales document/photo is removed during Edit Sale, so orphaned test/removed
// files don't accumulate in Cloudinary indefinitely.
app.post('/api/cloudinary/delete', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { publicId, resourceType } = req.body || {};

    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ success: false, error: 'publicId is required' });
    }
    // resourceType must be the exact value the upload response returned (image/raw/video) - never
    // silently guessed. A missing/invalid value here means the stored metadata is untrustworthy,
    // and guessing could target the wrong resource type and falsely report success.
    if (!resourceType || !['image', 'raw', 'video'].includes(resourceType)) {
      return res.status(400).json({ success: false, error: 'A valid resourceType (image, raw, or video) is required' });
    }

    if (!cloudinaryConfigured) {
      return res.status(503).json({
        success: false,
        error: 'Cloudinary admin credentials are not configured on the server - file was not deleted from Cloudinary',
      });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    // "ok" = Cloudinary confirmed the asset was deleted just now.
    // "not found" = the asset did not exist under this public_id/resource_type. This is treated as
    // an idempotent success (nothing left to clean up) but is reported with its own `result` value
    // rather than being indistinguishable from a confirmed "ok" deletion, so callers/logs can tell
    // the two apart instead of us silently claiming a deletion that never happened.
    if (result.result === 'ok') {
      return res.json({ success: true, result: 'ok' });
    }
    if (result.result === 'not found') {
      return res.json({ success: true, result: 'not_found' });
    }

    return res.status(502).json({ success: false, error: `Cloudinary deletion failed: ${result.result}` });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Cloudinary deletion error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file from Cloudinary',
    });
  }
});

// DELETE /api/sales/:id - Delete a sale (admin only)
app.delete('/api/sales/:id', authenticate, requireAdmin, rateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    await deleteSaleAdmin(id);

    res.json({ success: true });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    console.error('Sale deletion error:', safeMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sale',
    });
  }
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`✅ AI Assistant API running on http://localhost:${PORT}`);
  console.log(`🔐 Authentication: Firebase ID Token verification via Admin SDK`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
