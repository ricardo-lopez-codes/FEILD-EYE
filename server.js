"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");

const {
    TranslationServiceClient
} = require("@google-cloud/translate");

const textToSpeech =
    require("@google-cloud/text-to-speech");


// ============================================================
// EXPRESS
// ============================================================

const app = express();

const PORT =
    process.env.PORT || 8000;


// ============================================================
// CONFIGURATION
// ============================================================

// ESP32 IP
const ESP32_URL =
    process.env.ESP32_URL ||
    "http://10.146.88.133";


function getRequestedESP32URL(req) {

    const requested =
        String(
            req.query.esp32 || ""
        ).trim();

    if (!requested) {
        return ESP32_URL;
    }

    /*
       Accept either:
       10.237.129.133
       http://10.237.129.133
    */

    let value = requested;

    if (
        !/^https?:\/\//i.test(value)
    ) {
        value =
            `http://${value}`;
    }

    return value.replace(
        /\/+$/,
        ""
    );
}


// Roboflow
const ROBOFLOW_API_KEY =
    process.env.ROBOFLOW_API_KEY ||
    "";

const ROBOFLOW_MODEL =
    process.env.ROBOFLOW_MODEL ||
    "pest-detection-6neyl";

const ROBOFLOW_VERSION =
    process.env.ROBOFLOW_VERSION ||
    "2";


// Google Cloud
const GOOGLE_PROJECT =
    process.env.GOOGLE_CLOUD_PROJECT ||
    "circular-curve-424206-v3";


// ============================================================
// GOOGLE CLIENTS
// ============================================================

const translationClient =
    new TranslationServiceClient();

const ttsClient =
    new textToSpeech.TextToSpeechClient();


// ============================================================
// FILE UPLOAD
// ============================================================

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                20 * 1024 * 1024

        }

    });


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// Serve dashboard files
app.use(
    express.static(__dirname)
);


// ============================================================
// ROOT
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


// ============================================================
// SERVER STATUS
// ============================================================

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            success: true,

            server:
                "AG Rover Dashboard",

            status:
                "online",

            port:
                PORT,

            esp32:
                ESP32_URL,

            roboflow: {

                configured:
                    Boolean(
                        ROBOFLOW_API_KEY
                    ),

                model:
                    ROBOFLOW_MODEL,

                version:
                    ROBOFLOW_VERSION,

                endpoint:
                    `https://serverless.roboflow.com/${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`

            }

        });

    }
);


// ============================================================
// ESP32 DATA
// ============================================================

app.get(
    "/api/rover/data",
    async (req, res) => {

        try {

            const roverURL = getRequestedESP32URL(req);

            const response =
                await fetch(
                    `${roverURL}/data`,
                    {

                        method:
                            "GET",

                        signal:
                            AbortSignal.timeout(
                                4000
                            )

                    }
                );


            if (!response.ok) {

                throw new Error(
                    `ESP32 HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            console.log(
                "[ESP32 DATA]",
                data
            );


            res.json({

                success:
                    true,

                connected:
                    true,

                ...data

            });

        }

        catch (error) {

            console.error(
                "[ESP32 ERROR]",
                error.message
            );


            res.status(503).json({

                success:
                    false,

                connected:
                    false,

                error:
                    "ESP32 is not reachable",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// ESP32 COMMAND
// ============================================================

app.get(
    "/api/rover/command",
    async (req, res) => {

        try {

            const roverURL = getRequestedESP32URL(req);

            const command =
                String(
                    req.query.cmd ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const allowedCommands = [

                "FORWARD",
                "BACKWARD",
                "LEFT",
                "RIGHT",
                "STOP",
                "MANUAL",
                "AUTOMATIC"

            ];


            if (
                !allowedCommands.includes(
                    command
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Invalid rover command",

                    allowed:
                        allowedCommands

                });

            }


            console.log(
                "[ROVER COMMAND]",
                command
            );


            const response =
                await fetch(

                    `${roverURL}/command?cmd=${encodeURIComponent(command)}`,

                    {

                        method:
                            "GET",

                        signal:
                            AbortSignal.timeout(
                                4000
                            )

                    }

                );


            const result =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    `ESP32 HTTP ${response.status}: ${result}`
                );

            }


            res.json({

                success:
                    true,

                command,

                result

            });

        }

        catch (error) {

            console.error(
                "[COMMAND ERROR]",
                error.message
            );


            res.status(503).json({

                success:
                    false,

                error:
                    "Could not communicate with ESP32",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// SPRAY
// ============================================================

app.get(
    "/api/rover/spray",
    async (req, res) => {

        try {

            const roverURL = getRequestedESP32URL(req);

            console.log(
                "[SPRAY] Activating sprayer"
            );


            const response =
                await fetch(

                    `${roverURL}/spray`,

                    {

                        method:
                            "GET",

                        signal:
                            AbortSignal.timeout(
                                5000
                            )

                    }

                );


            const result =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    `ESP32 HTTP ${response.status}: ${result}`
                );

            }


            console.log(
                "[SPRAY RESULT]",
                result
            );


            res.json({

                success:
                    true,

                message:
                    "Spray command sent",

                result

            });

        }

        catch (error) {

            console.error(
                "[SPRAY ERROR]",
                error.message
            );


            res.status(503).json({

                success:
                    false,

                error:
                    "Could not activate spray",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// ROBOFLOW IMAGE ANALYSIS
// ============================================================

app.post(
    "/api/analyze",
    upload.single("image"),
    async (req, res) => {

        try {

            console.log(
                "========================================"
            );

            console.log(
                "[ROBOFLOW] New image analysis request"
            );


            // ------------------------------------------------
            // Check image
            // ------------------------------------------------

            if (!req.file) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "No image uploaded"

                });

            }


            console.log(
                "[ROBOFLOW] File:",
                req.file.originalname
            );

            console.log(
                "[ROBOFLOW] Size:",
                req.file.size,
                "bytes"
            );

            console.log(
                "[ROBOFLOW] Type:",
                req.file.mimetype
            );


            // ------------------------------------------------
            // Check API key
            // ------------------------------------------------

            if (!ROBOFLOW_API_KEY) {

                return res.status(500).json({

                    success:
                        false,

                    error:
                        "Roboflow API key is not configured"

                });

            }


            // ------------------------------------------------
            // Build model ID
            // ------------------------------------------------

            const modelId =
                `${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`;


            console.log(
                "[ROBOFLOW] Model:",
                modelId
            );


            // ------------------------------------------------
            // Convert image to base64
            // ------------------------------------------------

            const base64Image =
                req.file.buffer.toString(
                    "base64"
                );


            // ------------------------------------------------
            // SERVERLESS ROBOFLOW API V2
            // ------------------------------------------------

            const roboflowURL =
                `https://serverless.roboflow.com/${modelId}`;


            console.log(
                "[ROBOFLOW] Endpoint:",
                roboflowURL
            );


            // ------------------------------------------------
            // Send request
            // ------------------------------------------------

            const response =
                await fetch(
                    roboflowURL,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded",

                            "Authorization":
                                `Bearer ${ROBOFLOW_API_KEY}`

                        },

                        body:
                            base64Image,

                        signal:
                            AbortSignal.timeout(
                                60000
                            )

                    }
                );


            const responseText =
                await response.text();


            console.log(
                "[ROBOFLOW] HTTP:",
                response.status
            );


            // ------------------------------------------------
            // Roboflow error
            // ------------------------------------------------

            if (!response.ok) {

                console.error(
                    "[ROBOFLOW ERROR]",
                    responseText
                );


                return res.status(
                    response.status
                ).json({

                    success:
                        false,

                    error:
                        `Roboflow HTTP ${response.status}`,

                    details:
                        responseText

                });

            }


            // ------------------------------------------------
            // Parse response
            // ------------------------------------------------

            let result;


            try {

                result =
                    JSON.parse(
                        responseText
                    );

            }

            catch (error) {

                console.error(
                    "[ROBOFLOW] Invalid JSON:",
                    responseText
                );


                throw new Error(
                    "Roboflow returned invalid JSON"
                );

            }


            console.log(
                "[ROBOFLOW RESULT]",
                JSON.stringify(
                    result,
                    null,
                    2
                )
            );


            // ------------------------------------------------
            // Predictions
            // ------------------------------------------------

            const predictions =
                Array.isArray(
                    result.predictions
                )
                    ? result.predictions
                    : [];


            // ------------------------------------------------
            // No detections
            // ------------------------------------------------

            if (
                predictions.length === 0
            ) {

                console.log(
                    "[ROBOFLOW] No pest detected"
                );


                return res.json({

                    success:
                        true,

                    detected:
                        false,

                    pest:
                        null,

                    confidence:
                        0,

                    confidencePercent:
                        0,

                    predictions:
                        [],

                    solution:
                        "No pest was detected in the analysed image."

                });

            }


            // ------------------------------------------------
            // Find highest confidence detection
            // ------------------------------------------------

            let bestDetection =
                predictions[0];


            for (
                const prediction
                of predictions
            ) {

                if (
                    Number(
                        prediction.confidence ||
                        0
                    ) >

                    Number(
                        bestDetection.confidence ||
                        0
                    )
                ) {

                    bestDetection =
                        prediction;

                }

            }


            // ------------------------------------------------
            // Pest name
            // ------------------------------------------------

            const pest =
                bestDetection.class ||
                bestDetection.label ||
                "Unknown pest";


            // ------------------------------------------------
            // Confidence
            // ------------------------------------------------

            const confidence =
                Number(
                    bestDetection.confidence ||
                    0
                );


            const confidencePercent =
                Math.round(
                    confidence * 100
                );


            // ------------------------------------------------
            // Solution
            // ------------------------------------------------

            const solution =
                generatePestSolution(
                    pest
                );


            console.log(
                "[PEST]",
                pest
            );

            console.log(
                "[CONFIDENCE]",
                confidencePercent + "%"
            );

            console.log(
                "[SOLUTION]",
                solution
            );


            // ------------------------------------------------
            // Send result to dashboard
            // ------------------------------------------------

            res.json({

                success:
                    true,

                detected:
                    true,

                pest:

                    pest,

                confidence:

                    confidence,

                confidencePercent:

                    confidencePercent,

                detection:

                    bestDetection,

                predictions:

                    predictions,

                solution:

                    solution

            });


            console.log(
                "========================================"
            );

        }

        catch (error) {

            console.error(
                "[ROBOFLOW FATAL ERROR]",
                error
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Image analysis failed",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// PEST SOLUTIONS
// ============================================================

function generatePestSolution(
    pest
) {

    const name =
        String(pest)
            .toLowerCase()
            .trim();


    const solutions = {


        aphid:

            "Aphids have been detected on the plant. Inspect the affected leaves and apply an appropriate pest-control treatment.",


        "spider mite":

            "Spider mites have been detected. Inspect the underside of leaves and use an appropriate mite-control treatment.",


        "spider mites":

            "Spider mites have been detected. Inspect the underside of leaves and use an appropriate mite-control treatment.",


        whitefly:

            "Whiteflies have been detected. Inspect affected leaves and apply an appropriate whitefly-control treatment.",


        "white fly":

            "Whiteflies have been detected. Inspect affected leaves and apply an appropriate whitefly-control treatment.",


        thrips:

            "Thrips have been detected. Inspect flowers and young leaves and apply an appropriate treatment.",


        caterpillar:

            "Caterpillars have been detected. Inspect the plant and remove affected pests before applying a suitable treatment.",


        mealybug:

            "Mealybugs have been detected. Inspect stems and leaves and apply an appropriate pest-control treatment."

    };


    return (
        solutions[name] ||

        `${pest} has been detected on the plant. Inspect the affected area and apply an appropriate pest-control treatment.`
    );

}


// ============================================================
// GOOGLE TRANSLATION
// ============================================================

app.post(
    "/api/translate",
    async (req, res) => {

        try {

            const {
                text,
                targetLanguage
            } = req.body;


            if (
                !text ||
                !targetLanguage
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Text and target language are required"

                });

            }


            if (
                targetLanguage ===
                "en"
            ) {

                return res.json({

                    success:
                        true,

                    originalText:
                        text,

                    translatedText:
                        text,

                    targetLanguage:
                        "en"

                });

            }


            const request = {

                parent:
                    `projects/${GOOGLE_PROJECT}/locations/global`,

                contents: [
                    String(text)
                ],

                mimeType:
                    "text/plain",

                sourceLanguageCode:
                    "en",

                targetLanguageCode:
                    String(
                        targetLanguage
                    )

            };


            const [
                response
            ] =
                await translationClient
                    .translateText(
                        request
                    );


            const translatedText =
                response
                    .translations?.[0]
                    ?.translatedText ||
                text;


            res.json({

                success:
                    true,

                originalText:
                    text,

                translatedText:
                    translatedText,

                targetLanguage:
                    targetLanguage

            });

        }

        catch (error) {

            console.error(
                "[TRANSLATION ERROR]",
                error
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Translation failed",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// GOOGLE TTS
// ============================================================

app.post(
    "/api/tts",
    async (req, res) => {

        try {

            const {
                text,
                languageCode
            } = req.body;


            if (!text) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Text is required"

                });

            }


            const request = {

                input: {

                    text:
                        String(text)

                },

                voice: {

                    languageCode:
                        languageCode ||
                        "en-IN",

                    ssmlGender:
                        "NEUTRAL"

                },

                audioConfig: {

                    audioEncoding:
                        "MP3"

                }

            };


            const [
                response
            ] =
                await ttsClient
                    .synthesizeSpeech(
                        request
                    );


            const audioBase64 =
                Buffer
                    .from(
                        response.audioContent
                    )
                    .toString(
                        "base64"
                    );


            res.json({

                success:
                    true,

                languageCode:
                    languageCode ||
                    "en-IN",

                audioContent:
                    audioBase64

            });

        }

        catch (error) {

            console.error(
                "[TTS ERROR]",
                error
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Text-to-speech failed",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// GOOGLE TRANSLATION + TTS
// ============================================================

app.post(
    "/api/translate-speak",
    async (req, res) => {

        try {

            const {
                text,
                targetLanguage,
                languageCode
            } = req.body;


            if (
                !text ||
                !targetLanguage
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Text and target language are required"

                });

            }


            // -----------------------------------------------
            // TRANSLATE
            // -----------------------------------------------

            let translatedText =
                String(text);


            if (
                targetLanguage !==
                "en"
            ) {

                const request = {

                    parent:
                        `projects/${GOOGLE_PROJECT}/locations/global`,

                    contents: [
                        String(text)
                    ],

                    mimeType:
                        "text/plain",

                    sourceLanguageCode:
                        "en",

                    targetLanguageCode:
                        String(
                            targetLanguage
                        )

                };


                const [
                    response
                ] =
                    await translationClient
                        .translateText(
                            request
                        );


                translatedText =
                    response
                        .translations?.[0]
                        ?.translatedText ||
                    text;

            }


            // -----------------------------------------------
            // TTS
            // -----------------------------------------------

            const ttsLanguage =
                languageCode ||
                getTTSLanguage(
                    targetLanguage
                );


            const ttsRequest = {

                input: {

                    text:
                        translatedText

                },

                voice: {

                    languageCode:
                        ttsLanguage,

                    ssmlGender:
                        "NEUTRAL"

                },

                audioConfig: {

                    audioEncoding:
                        "MP3"

                }

            };


            const [
                ttsResponse
            ] =
                await ttsClient
                    .synthesizeSpeech(
                        ttsRequest
                    );


            const audioBase64 =
                Buffer
                    .from(
                        ttsResponse.audioContent
                    )
                    .toString(
                        "base64"
                    );


            res.json({

                success:
                    true,

                originalText:
                    text,

                translatedText:
                    translatedText,

                targetLanguage:
                    targetLanguage,

                languageCode:
                    ttsLanguage,

                audioContent:
                    audioBase64

            });

        }

        catch (error) {

            console.error(
                "[TRANSLATE + TTS ERROR]",
                error
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Translation / TTS failed",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// TTS LANGUAGE MAP
// ============================================================

function getTTSLanguage(
    language
) {

    const languages = {

        en:
            "en-IN",

        ta:
            "ta-IN",

        hi:
            "hi-IN",

        te:
            "te-IN",

        kn:
            "kn-IN",

        ml:
            "ml-IN",

        bn:
            "bn-IN",

        mr:
            "mr-IN",

        gu:
            "gu-IN",

        pa:
            "pa-IN"

    };


    return (
        languages[language] ||
        language ||
        "en-IN"
    );

}


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "[SERVER ERROR]",
            err
        );


        if (
            res.headersSent
        ) {

            return next(
                err
            );

        }


        res.status(500).json({

            success:
                false,

            error:
                "Internal server error",

            details:
                err.message

        });

    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "          AG ROVER DASHBOARD"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Dashboard : http://localhost:${PORT}`
        );

        console.log(
            `ESP32     : ${ESP32_URL}`
        );

        console.log(
            "Relay     : GPIO 13 / Active LOW"
        );

        console.log(
            "Spray     : 2 seconds"
        );

        console.log(
            `Roboflow  : ${
                ROBOFLOW_API_KEY
                    ? "READY"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            `Model     : ${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`
        );

        console.log(
            "RF API    : Serverless Hosted API"
        );

        console.log(
            "Translation: READY"
        );

        console.log(
            "TTS       : READY"
        );

        console.log(
            "========================================"
        );

        console.log("");

    }
);