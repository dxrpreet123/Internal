
require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: true, // Allow all origins for simplicity in this setup, or specify your domain
    credentials: true
}));

// Serve Static Frontend Files (Vite Build)
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Razorpay
// WARNING: RAZORPAY_KEY_SECRET must stay on the server. Never send it to the client.
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * 1. CREATE ORDER ENDPOINT (ONE-TIME PAYMENT)
 */
app.post('/api/payment/order', async (req, res) => {
    try {
        const { amount, currency, receipt } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ success: false, error: "Amount and currency are required" });
        }

        const options = {
            amount: amount, 
            currency: currency,
            receipt: receipt || `receipt_${Date.now()}`,
            payment_capture: 1 
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID 
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, error: "Failed to create order" });
    }
});

/**
 * 2. CREATE SUBSCRIPTION ENDPOINT (RECURRING)
 *    Requires PLAN IDs in .env
 */
app.post('/api/payment/subscription', async (req, res) => {
    try {
        const { planType } = req.body; // 'MONTHLY' or 'YEARLY'
        
        let planId = process.env.RAZORPAY_PLAN_ID_MONTHLY;
        if (planType === 'YEARLY') {
            planId = process.env.RAZORPAY_PLAN_ID_YEARLY;
        }

        if (!planId) {
            return res.status(500).json({ 
                success: false, 
                error: "Plan ID not configured on server. Please set RAZORPAY_PLAN_ID_MONTHLY/YEARLY." 
            });
        }

        // Create Subscription
        // https://razorpay.com/docs/api/subscriptions/#create-a-subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 120, // Number of billing cycles (e.g., 10 years)
            quantity: 1,
            addons: [],
            notes: {
                source: "Orbis Web App"
            }
        });

        res.json({
            success: true,
            id: subscription.id, // This is the subscription_id needed by checkout
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to create subscription" });
    }
});

/**
 * 3. VERIFY PAYMENT ENDPOINT (ONE-TIME)
 */
app.post('/api/payment/verify', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: "Missing payment details" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            console.log(`Payment Verified: ${razorpay_payment_id}`);
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            console.error(`Invalid Signature for order ${razorpay_order_id}`);
            res.status(400).json({ success: false, error: "Invalid payment signature" });
        }

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

/**
 * 4. VERIFY SUBSCRIPTION ENDPOINT
 *    Signature logic is different for subscriptions: payment_id + "|" + subscription_id
 */
app.post('/api/payment/verify-subscription', (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: "Missing subscription details" });
        }

        // Logic: hmac_sha256(razorpay_payment_id + "|" + razorpay_subscription_id, secret)
        const body = razorpay_payment_id + "|" + razorpay_subscription_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            console.log(`Subscription Payment Verified: ${razorpay_payment_id}`);
            // TODO: Update user DB to set tier='PRO' and store subscription_id
            res.json({ success: true, message: "Subscription verified successfully" });
        } else {
            console.error(`Invalid Signature for subscription ${razorpay_subscription_id}`);
            res.status(400).json({ success: false, error: "Invalid payment signature" });
        }

    } catch (error) {
        console.error("Subscription verification error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Catch-all route to serve the React frontend for any unknown paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});