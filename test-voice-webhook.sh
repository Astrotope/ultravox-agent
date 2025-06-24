#!/bin/bash

# Test script specifically for the new Twilio voice webhook endpoint

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing Twilio Voice Webhook"
echo "Base URL: $BASE_URL"
echo ""

echo "Testing voice webhook endpoint..."
response=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"CallSid": "CA12345", "From": "+1234567890", "To": "+0987654321"}' "$BASE_URL/api/v1/webhook/twilio/voice")

echo "Response:"
echo "$response"
echo ""

if [[ $response == *"<?xml"* && $response == *"<Response>"* ]]; then
    echo "✅ PASS: Voice webhook returns TwiML XML"
else
    echo "❌ FAIL: Voice webhook should return TwiML XML"
fi

echo ""
echo "Testing status webhook for comparison..."
status_response=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"CallSid": "CA12345", "CallStatus": "in-progress", "From": "+1234567890", "To": "+0987654321"}' "$BASE_URL/api/v1/webhook/twilio")

echo "Response:"
echo "$status_response"
echo ""

if [[ $status_response == *'"success":true'* && $status_response == *'"data":'* ]]; then
    echo "✅ PASS: Status webhook returns JSON"
else
    echo "❌ FAIL: Status webhook should return JSON"
fi