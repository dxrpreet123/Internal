
# Orbis Payment Integration (Subscriptions)

This project includes a secure Node.js backend for handling Razorpay Subscriptions.

## Security Alert
**Do NOT commit the `.env` file.** It contains your Secret Keys.

## Quick Start

1.  **Install Backend Dependencies:**
    ```bash
    npm install express razorpay cors dotenv
    ```

2.  **Configure Environment:**
    *   Create a `.env` file in the root directory.
    *   Log in to Razorpay Dashboard.
    *   Go to **Subscriptions > Plans** and create a Monthly and a Yearly plan.
    *   Copy the `plan_id` for each.
    *   Update `.env`:
    ```env
    RAZORPAY_KEY_ID=your_key_id
    RAZORPAY_KEY_SECRET=your_key_secret
    RAZORPAY_PLAN_ID_MONTHLY=plan_xxxxxxxxxxxxx
    RAZORPAY_PLAN_ID_YEARLY=plan_xxxxxxxxxxxxx
    PORT=5000
    ```

3.  **Run Server:**
    ```bash
    node server.js
    ```
    The server will start on port 5000.

4.  **Run Frontend:**
    *   Ensure your Vite app is running (`npm run dev`).
    *   The frontend expects the server at `http://localhost:5000`.

## Go-Live Checklist

1.  **Key Rotation:** Ensure you are using keys generated *after* any potential leaks.
2.  **HTTPS:** In production, ensure your backend is served over HTTPS.
3.  **Webhooks:** Set up Razorpay Webhooks (`subscription.charged`, `subscription.cancelled`) to handle renewals and cancellations automatically.
4.  **Environment Variables:** Never commit `.env` files to version control.
