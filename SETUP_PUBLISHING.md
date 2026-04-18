# SETUP_PUBLISHING.md

Detailed guide to obtaining the credentials required for the Instagram Graph API.

---

## Prerequisites
1.  **Instagram Professional Account**: Your Instagram account must be a **Business** or **Creator** account.
2.  **Facebook Page**: The Instagram account must be linked to a Facebook Page.
3.  **Meta Developer Account**: You must be registered at [developers.facebook.com](https://developers.facebook.com).

---

## Step 1: Create a Meta App
1.  Go to [My Apps](https://developers.facebook.com/apps).
2.  Click **Create App**.
3.  Select **Other** → **Business**.
4.  Give it a name (e.g., `Ravist Publisher`).

---

## Step 2: Add Instagram Graph API
1.  In your App Dashboard, scroll down to **Add a Product**.
2.  Find **Instagram Graph API** and click **Set Up**.

---

## Step 3: Get a User Access Token (Short-lived)
1.  Go to the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2.  Select your **App** in the top right.
3.  Under **User or Page**, select **Get User Access Token**.
4.  Add these specific **Permissions**:
    *   `instagram_basic`
    *   `instagram_content_publish`
    *   `pages_read_engagement`
    *   `pages_show_list`
    *   `ads_management`
    *   `business_management`
5.  Click **Generate Access Token** and log in to Facebook.

---

## Step 4: Get the INSTAGRAM_BUSINESS_ACCOUNT_ID
1.  In the Graph API Explorer, change the GET request to:
    `me/accounts?fields=name,id,instagram_business_account`
2.  Click **Submit**.
3.  In the JSON response, find your Page. Under it, you will see `instagram_business_account`.
4.  Copy the numeric `id` inside that object. This is your **`INSTAGRAM_BUSINESS_ACCOUNT_ID`**.

---

## Step 5: Get a Permanent INSTAGRAM_PAGE_ACCESS_TOKEN
1.  Copy the **User Access Token** from the Explorer.
2.  Go to the [Access Token Tool](https://developers.facebook.com/tools/accesstoken/).
3.  Find your token and click **Debug**.
4.  Click **Extend Access Token** at the bottom. This gives you a 60-day token.
5.  **To make it permanent**:
    *   Go back to [Explorer](https://developers.facebook.com/tools/explorer/).
    *   Paste the *extended* token.
    *   Request `me/accounts`.
    *   Copy the `access_token` for your specific Page.
    *   **Page Access Tokens generated this way NEVER expire** (unless you change your password or revoke permissions).
6.  Paste this into **`INSTAGRAM_PAGE_ACCESS_TOKEN`** in `.env`.

---

## Step 6: Final Test
Run the health check to verify your credentials:
```bash
curl http://localhost:3004/health
```
If configured correctly, it will show `instagram_api: "connected"`.
