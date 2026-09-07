"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");

let translationClient = null;
let ttsClient = null;

try {
    const { TranslationServiceClient } = require("@google-cloud/translate");
    const textToSpeech = require("@google-cloud/text-to-speech");
    translationClient = new TranslationServiceClient();
    ttsClient = new textToSpeech.TextToSpeechClient();
} catch (err) {
    console.warn("[WARN] Google Cloud clients not initialized. Using local fallbacks.");
}

const app = express();
const PORT = process.env.PORT || 8000;
const ESP32_URL = process.env.ESP32_URL || "http://10.146.88.133";

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || "";
const ROBOFLOW_MODEL = process.env.ROBOFLOW_MODEL || "pest-detection-6neyl";
const ROBOFLOW_VERSION = process.env.ROBOFLOW_VERSION || "2";
const GOOGLE_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "circular-curve-424206-v3";

function getRequestedESP32URL(req) {
    const requested = String(req.query.esp32 || "").trim();
    if (!requested) return ESP32_URL;

    let value = requested;
    if (!/^https?:\/\//i.test(value)) {
        value = `http://${value}`;
    }
    return value.replace(/\/+$/, "");
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        server: "AG Rover Dashboard",
        status: "online",
        port: PORT,
        esp32: ESP32_URL
    });
});

app.get("/api/rover/data", async (req, res) => {
    try {
        const roverURL = getRequestedESP32URL(req);
        const response = await fetch(`${roverURL}/data`, {
            method: "GET",
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) throw new Error(`ESP32 HTTP ${response.status}`);
        const data = await response.json();
        res.json({ success: true, connected: true, ...data });
    } catch (error) {
        res.status(503).json({
            success: false,
            connected: false,
            error: "ESP32 is not reachable",
            details: error.message
        });
    }
});

app.get("/api/rover/command", async (req, res) => {
    try {
        const roverURL = getRequestedESP32URL(req);
        const command = String(req.query.cmd || "").trim().toUpperCase();
        const allowedCommands = ["FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP", "MANUAL", "AUTOMATIC"];

        if (!allowedCommands.includes(command)) {
            return res.status(400).json({ success: false, error: "Invalid command" });
        }

        const response = await fetch(`${roverURL}/command?cmd=${encodeURIComponent(command)}`, {
            method: "GET",
            signal: AbortSignal.timeout(4000)
        });

        const result = await response.text();
        res.json({ success: true, command, result });
    } catch (error) {
        res.status(503).json({ success: false, error: "ESP32 error", details: error.message });
    }
});

app.get("/api/rover/spray", async (req, res) => {
    try {
        const roverURL = getRequestedESP32URL(req);
        const response = await fetch(`${roverURL}/spray`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        });

        const result = await response.text();
        res.json({ success: true, message: "Spray triggered", result });
    } catch (error) {
        res.status(503).json({ success: false, error: "Spray failed", details: error.message });
    }
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No image uploaded" });
        if (!ROBOFLOW_API_KEY) return res.status(500).json({ success: false, error: "Roboflow API key missing" });

        const modelId = `${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`;
        const base64Image = req.file.buffer.toString("base64");
        const roboflowURL = `https://serverless.roboflow.com/${modelId}`;

        const response = await fetch(roboflowURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Bearer ${ROBOFLOW_API_KEY}`
            },
            body: base64Image,
            signal: AbortSignal.timeout(60000)
        });

        const responseText = await response.text();
        if (!response.ok) return res.status(response.status).json({ success: false, error: responseText });

        const result = JSON.parse(responseText);
        const predictions = Array.isArray(result.predictions) ? result.predictions : [];

        if (predictions.length === 0) {
            return res.json({
                success: true,
                detected: false,
                pest: null,
                confidence: 0,
                confidencePercent: 0,
                predictions: [],
                solution: "No pest was detected in the analysed image."
            });
        }

        let bestDetection = predictions[0];
        for (const prediction of predictions) {
            if (Number(prediction.confidence || 0) > Number(bestDetection.confidence || 0)) {
                bestDetection = prediction;
            }
        }

        const pest = bestDetection.class || bestDetection.label || "Unknown pest";
        const confidence = Number(bestDetection.confidence || 0);

        res.json({
            success: true,
            detected: true,
            pest,
            confidence,
            confidencePercent: Math.round(confidence * 100),
            detection: bestDetection,
            predictions,
            solution: `${pest} detected. Inspect affected leaves and apply targeted treatment.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Image analysis failed", details: error.message });
    }
});

app.post("/api/translate", async (req, res) => {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage || targetLanguage === "en" || !translationClient) {
        return res.json({ success: true, originalText: text, translatedText: text, targetLanguage: targetLanguage || "en" });
    }

    try {
        const [response] = await translationClient.translateText({
            parent: `projects/${GOOGLE_PROJECT}/locations/global`,
            contents: [String(text)],
            mimeType: "text/plain",
            sourceLanguageCode: "en",
            targetLanguageCode: String(targetLanguage)
        });
        res.json({ success: true, originalText: text, translatedText: response.translations?.[0]?.translatedText || text, targetLanguage });
    } catch (error) {
        res.json({ success: true, originalText: text, translatedText: text, targetLanguage });
    }
});

app.post("/api/tts", async (req, res) => {
    const { text, languageCode } = req.body;
    if (!text || !ttsClient) {
        return res.status(501).json({ success: false, error: "TTS fallback to browser" });
    }

    try {
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text: String(text) },
            voice: { languageCode: languageCode || "en-IN", ssmlGender: "NEUTRAL" },
            audioConfig: { audioEncoding: "MP3" }
        });
        res.json({ success: true, audioContent: Buffer.from(response.audioContent).toString("base64") });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});