# Fluent-AI Backend

AI-powered voice and conversation backend built with Node.js + TypeScript.

## Tech Stack
- Node.js + TypeScript
- Docker + AWS EKS
- GitHub Actions CI/CD
- Helm for Kubernetes deployment

## DevOps Setup
- Dockerized with multi-stage build
- CI/CD pipeline via GitHub Actions
- Kubernetes deployment with Helm charts
- Auto-scaling configured (2-5 replicas)

## Run Locally
```bash
npm install
npm run build
npm start
```

## Docker
```bash
docker build -t fluent-ai .
docker run -p 3000:3000 fluent-ai
```

## GitHub
github.com/NishantDhiman028/Fluent-AI
