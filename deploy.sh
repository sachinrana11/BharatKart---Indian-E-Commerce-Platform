#!/bin/bash

set -e

echo "🚀 Starting deployment..."

cd /var/www/BharatKart---Indian-E-Commerce-Platform

echo "📥 Pulling latest code...."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "📂 Publishing build..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

echo "✅ Deployment complete!"