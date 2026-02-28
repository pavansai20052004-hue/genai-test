# GenAI-Test
AI Powered Chatbot Web Application

## Project Overview

GenAI-Test is a full-stack AI-powered chatbot application built using Node.js and Express. 
The application allows users to interact with a Generative AI model and receive intelligent real-time responses through a clean frontend interface.

This project demonstrates:
- REST API development
- AI API integration
- Frontend and Backend connectivity
- Deployment-ready structure

------------------------------------------------------------

## Tech Stack

Frontend:
- HTML
- CSS
- JavaScript
- Fetch API

Backend:
- Node.js
- Express.js
- CORS
- Environment Variables (.env)

AI Integration:
- Generative AI API (LLM model)

Deployment:
- Netlify (Frontend)
- Node Hosting Platform (Backend)

------------------------------------------------------------

## Project Structure

genai-test/
│
├── frontend/        Frontend UI files
├── server.js        Express server
├── index.js         Entry point
├── package.json     Project dependencies
├── .gitignore       Ignored files

------------------------------------------------------------

## Features

- AI-powered chatbot with real-time responses
- Clean and responsive UI
- Secure API key handling using environment variables
- Backend routing and error handling
- CORS configuration
- Production-ready structure

------------------------------------------------------------

## How It Works

1. User enters a message in the frontend.
2. The message is sent to the backend using Fetch API.
3. Backend processes the request and calls the AI API.
4. AI generates a response.
5. Response is returned and displayed to the user.

------------------------------------------------------------

## Installation & Setup

1. Clone the repository:

git clone https://github.com/your-username/genai-test.git
cd genai-test

2. Install dependencies:

npm install

3. Create a .env file and add:

API_KEY=your_api_key_here
PORT=5000

4. Start the server:

node server.js

------------------------------------------------------------

## Learning Outcomes

- Built a full-stack AI-integrated web application
- Implemented secure environment variables
- Understood backend routing and API communication
- Learned deployment workflow
- Debugged real-world server issues

------------------------------------------------------------

## Future Improvements

- Add chat history storage
- Implement JWT authentication
- Improve UI with animations
- Add multiple AI model support

------------------------------------------------------------

Author:
Pavan Sai
Full Stack Developer | Generative AI Enthusiast
