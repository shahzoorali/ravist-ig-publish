# Ravist Instagram Publisher

A specialized microservice designed to handle Instagram publishing (Reels + Stories) via the official Meta Graph API.

This service is part of the **Ravist** ecosystem, allowing automated or admin-triggered event promotion directly to Instagram.

## 🚀 Features
- **Reels Publishing**: Automatically creates and publishes Reels with AI-generated captions.
- **Stories Publishing**: Cross-posts event media to Instagram Stories.
- **Parallel Uploads**: Handles both Reel and Story uploads simultaneously for maximum efficiency.
- **Status Polling**: Robust polling mechanism to ensure media is fully processed by Meta before publishing.
- **Health Checks**: Built-in diagnostic endpoint to verify API connectivity and credentials.

## 🛠 Tech Stack
- **Node.js**: Runtime environment.
- **Express**: Framework for handled API requests.
- **Axios**: Promised-based HTTP client for Graph API interaction.
- **Nodemon**: For a smooth development workflow.

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shahzoorali/ravist-ig-publish.git
   cd ravist-ig-publish
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   PORT=3004
   INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id
   INSTAGRAM_PAGE_ACCESS_TOKEN=your_token
   ```
   *For detailed instructions on obtaining these IDs, see [SETUP_PUBLISHING.md](SETUP_PUBLISHING.md).*

4. **Run the service**:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📋 API Endpoints

### Health Check
`GET /health`
Verifies that the service is up and credentials are set.

### Preview Caption
`POST /api/preview-caption`
Generates a formatted Instagram caption based on Ravist event data.

### Publish to Instagram
`POST /api/publish`
Publishes a Reel and/or Story.
**Payload:**
```json
{
  "videoUrl": "https://s3.amazon.com/your-bucket/event-video.mp4",
  "caption": "Your amazing event is coming up! 📅 Sunday, April 12 #Ravist",
  "publishPost": true,
  "publishStory": true
}
```

## 📄 License
This project is private and intended for use within the Ravist platform.
