/* =========================================================
   AG ROVER DASHBOARD
   COMPLETE FRONTEND SCRIPT
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const roverState = {

    connected: false,

    bluetooth: false,

    mode: "Automatic",

    movement: "Scanning",

    sensor: {
        left: null,
        front: null,
        right: null
    },

    detection: null,

    confidence: 0,

    predictions: [],

    pestDetected: false,

    spraying: false,

    selectedImage: null,

    selectedImageURL: null,

    currentLanguage: "en",

    currentSolutionEnglish: "",

    currentDisplayedSolution: ""

};


/* =========================================================
   LANGUAGE
   ========================================================= */

const languages = {

    en: {
        name: "English",
        speech: "en-IN"
    },

    ta: {
        name: "Tamil",
        speech: "ta-IN"
    },

    hi: {
        name: "Hindi",
        speech: "hi-IN"
    },

    te: {
        name: "Telugu",
        speech: "te-IN"
    },

    kn: {
        name: "Kannada",
        speech: "kn-IN"
    },

    ml: {
        name: "Malayalam",
        speech: "ml-IN"
    }

};


/* =========================================================
   ELEMENT HELPERS
   ========================================================= */

function findElement(...selectors) {

    for (const selector of selectors) {

        try {

            const element =
                document.querySelector(selector);

            if (element) {

                return element;
            }

        } catch (error) {

            console.warn(
                "[DOM] Invalid selector:",
                selector
            );
        }
    }

    return null;
}


function setText(element, text) {

    if (!element) {

        return;
    }

    element.textContent =
        text ?? "";
}


function setHTML(element, html) {

    if (!element) {

        return;
    }

    element.innerHTML =
        html ?? "";
}


/* =========================================================
   GET DASHBOARD ELEMENTS
   ========================================================= */

function getElements() {

    return {

        /* ---------------------------------------------
           Language
        --------------------------------------------- */

        languageSelect: findElement(
            "#language-select",
            "#languageSelect",
            "[name='language']"
        ),


        /* ---------------------------------------------
           Detection
        --------------------------------------------- */

        detection: findElement(
            "#detection",
            "#detection-text",
            ".detection-text"
        ),

        confidence: findElement(
            "#confidence",
            "#confidence-value",
            ".confidence-row strong"
        ),

        detections: findElement(
            "#detections",
            "#detection-list",
            ".detections"
        ),


        /* ---------------------------------------------
           Solution
        --------------------------------------------- */

        solution: findElement(
            "#solution-text",
            "#solution",
            ".solution-text"
        ),

        listenButton: findElement(
            "#listen-button",
            "#listenButton",
            ".listen-button"
        ),


        /* ---------------------------------------------
           Action panel
        --------------------------------------------- */

        actionPanel: findElement(
            "#action-required",
            "#action-panel",
            ".action-required"
        ),

        actionTitle: findElement(
            "#action-title",
            ".action-title"
        ),

        actionMessage: findElement(
            "#action-message",
            ".action-message"
        ),

        actionQuestion: findElement(
            "#action-question",
            ".action-question"
        ),

       yesButton: findElement(
    "#sprayYes",
    "#spray-yes",
    "#yes-button",
    ".spray-yes"
),

noButton: findElement(
    "#sprayNo",
    "#spray-no",
    "#no-button",
    ".spray-no"
),

        /* ---------------------------------------------
           Rover
        --------------------------------------------- */

        bluetooth: findElement(
            "#bluetooth-status",
            "#bluetooth",
            ".bluetooth-status"
        ),

        mode: findElement(
            "#rover-mode",
            "#mode-status",
            "#mode",
            ".mode-status"
        ),

        movement: findElement(
            "#rover-movement",
            "#movement-status",
            "#movement",
            ".movement-status"
        ),


        /* ---------------------------------------------
           Sensors
        --------------------------------------------- */

        leftSensor: findElement(
            "#left-sensor",
            "#sensor-left",
            "#left"
        ),

        frontSensor: findElement(
            "#front-sensor",
            "#sensor-front",
            "#front"
        ),

        rightSensor: findElement(
            "#right-sensor",
            "#sensor-right",
            "#right"
        ),


        /* ---------------------------------------------
           Notifications
        --------------------------------------------- */

        notificationList: findElement(
            "#notification-list",
            "#notifications",
            ".notification-list"
        ),


        /* ---------------------------------------------
           Camera
        --------------------------------------------- */

        camera: findElement(
            "#camera-feed",
            "#camera-container",
            ".camera-container"
        )

    };

}



/* =========================================================
   DEVICE IP CONNECTION
   ========================================================= */

const DEVICE_STORAGE_KEYS = {
    esp32: "ag_rover_esp32_ip",
    camera: "ag_rover_esp32_cam_ip"
};


function normalizeDeviceIP(value) {

    return String(value || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .replace(/:81$/i, "");
}


function getDeviceIPs() {

    return {
        esp32:
            localStorage.getItem(
                DEVICE_STORAGE_KEYS.esp32
            ) || "",

        camera:
            localStorage.getItem(
                DEVICE_STORAGE_KEYS.camera
            ) || ""
    };
}


function getESP32BaseURL() {

    const ips =
        getDeviceIPs();

    return ips.esp32
        ? `http://${ips.esp32}`
        : "";
}


function getCameraStreamURL() {

    const ips =
        getDeviceIPs();

    return ips.camera
        ? `http://${ips.camera}:81/stream`
        : "";
}


function showConnectionModal() {

    const modal =
        document.getElementById(
            "connectionModal"
        );

    if (!modal) {
        return;
    }

    const ips =
        getDeviceIPs();

    const esp32Input =
        document.getElementById(
            "esp32IpInput"
        );

    const cameraInput =
        document.getElementById(
            "esp32CamIpInput"
        );

    if (esp32Input) {
        esp32Input.value =
            ips.esp32;
    }

    if (cameraInput) {
        cameraInput.value =
            ips.camera;
    }

    modal.classList.remove(
        "hidden"
    );
}


function hideConnectionModal() {

    const modal =
        document.getElementById(
            "connectionModal"
        );

    if (modal) {
        modal.classList.add(
            "hidden"
        );
    }
}


function setupDeviceConnectionPopup() {

    const modal =
        document.getElementById(
            "connectionModal"
        );

    const button =
        document.getElementById(
            "connectDevicesBtn"
        );

    const esp32Input =
        document.getElementById(
            "esp32IpInput"
        );

    const cameraInput =
        document.getElementById(
            "esp32CamIpInput"
        );

    const errorElement =
        document.getElementById(
            "connectionError"
        );

    if (
        !modal ||
        !button ||
        !esp32Input ||
        !cameraInput
    ) {
        console.warn(
            "[CONNECTION] Popup elements not found."
        );
        return;
    }


    const ips =
        getDeviceIPs();

    esp32Input.value =
        ips.esp32;

    cameraInput.value =
        ips.camera;


    button.addEventListener(
        "click",
        () => {

            const esp32IP =
                normalizeDeviceIP(
                    esp32Input.value
                );

            const cameraIP =
                normalizeDeviceIP(
                    cameraInput.value
                );


            if (!esp32IP) {

                if (errorElement) {
                    errorElement.textContent =
                        "Please enter the ESP32 rover IP.";
                }

                esp32Input.focus();
                return;
            }


            if (!cameraIP) {

                if (errorElement) {
                    errorElement.textContent =
                        "Please enter the ESP32-CAM IP.";
                }

                cameraInput.focus();
                return;
            }


            localStorage.setItem(
                DEVICE_STORAGE_KEYS.esp32,
                esp32IP
            );

            localStorage.setItem(
                DEVICE_STORAGE_KEYS.camera,
                cameraIP
            );


            if (errorElement) {
                errorElement.textContent = "";
            }


            console.log(
                "[CONNECTION] ESP32:",
                getESP32BaseURL()
            );

            console.log(
                "[CONNECTION] ESP32-CAM:",
                getCameraStreamURL()
            );


            setCameraFeed(
                getCameraStreamURL()
            );


            hideConnectionModal();


            addNotification(
                "Devices configured",
                `ESP32: ${esp32IP} | ESP32-CAM: ${cameraIP}`,
                "success"
            );


            /*
               Immediately refresh rover data
               using the selected ESP32.
            */

            pollRoverData();

        }
    );


    /*
       Allow Enter in either field.
    */

    [
        esp32Input,
        cameraInput
    ].forEach(
        input => {

            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        button.click();
                    }
                }
            );

        }
    );


    /*
       Expose a simple way to reopen
       the popup from the console.
    */

    window.changeRoverIPs =
        showConnectionModal;


    /*
       First launch:
       show popup if either IP is missing.
    */

    if (
        !ips.esp32 ||
        !ips.camera
    ) {

        showConnectionModal();

    } else {

        hideConnectionModal();

        setCameraFeed(
            getCameraStreamURL()
        );
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "        AG ROVER DASHBOARD"
        );

        console.log(
            "        JavaScript initialized"
        );

        console.log(
            "========================================"
        );


        setupDeviceConnectionPopup();

        setupLanguage();

        setupListenButton();

        setupSprayButtons();

        setupClearNotifications();

        setupImageUpload();

        updateRoverStatus();

        hideActionPanel();

        /*
           IMPORTANT:
           No fake pest detection.
           No fake sensor values.
        */

        startRoverPolling();

    }
);


/* =========================================================
   LANGUAGE
   ========================================================= */

function setupLanguage() {

    const elements =
        getElements();

    if (!elements.languageSelect) {

        console.warn(
            "[LANGUAGE] Selector not found."
        );

        return;
    }


    if (
        elements.languageSelect.dataset.bound ===
        "true"
    ) {

        return;
    }


    elements.languageSelect.dataset.bound =
        "true";


    elements.languageSelect.addEventListener(
        "change",
        async function () {

            let language =
                String(this.value)
                    .toLowerCase()
                    .trim();


            if (
                language === "english"
            ) {

                language = "en";

            } else if (
                language === "tamil" ||
                language === "தமிழ்"
            ) {

                language = "ta";

            } else if (
                language === "hindi"
            ) {

                language = "hi";

            } else if (
                language === "telugu"
            ) {

                language = "te";

            } else if (
                language === "kannada"
            ) {

                language = "kn";

            } else if (
                language === "malayalam"
            ) {

                language = "ml";
            }


            roverState.currentLanguage =
                language;


            console.log(
                "[LANGUAGE]",
                language
            );


            if (
                roverState.currentSolutionEnglish
            ) {

                await updateSolutionCentre(
                    roverState.currentSolutionEnglish
                );
            }

        }
    );

}


/* =========================================================
   TRANSLATION
   ========================================================= */

async function translateText(
    text,
    targetLanguage
) {

    if (
        !text ||
        !targetLanguage ||
        targetLanguage === "en"
    ) {

        return text;
    }


    try {

        const response =
            await fetch(
                "/api/translate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text: text,

                        targetLanguage:
                            targetLanguage

                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Translation HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.translatedText
        ) {

            throw new Error(
                data.error ||
                "Translation failed"
            );
        }


        return data.translatedText;

    } catch (error) {

        console.error(
            "[TRANSLATION ERROR]",
            error
        );

        /*
           Keep English if translation fails.
        */

        return text;
    }

}


/* =========================================================
   SOLUTION CENTRE
   ========================================================= */

async function updateSolutionCentre(
    englishSolution
) {

    roverState.currentSolutionEnglish =
        englishSolution;


    const translated =
        await translateText(
            englishSolution,
            roverState.currentLanguage
        );


    roverState.currentDisplayedSolution =
        translated;


    const elements =
        getElements();


    setText(
        elements.solution,
        translated
    );


    console.log(
        "[SOLUTION]",
        translated
    );

}


/* =========================================================
   TTS
   ========================================================= */

function setupListenButton() {

    const elements =
        getElements();


    if (!elements.listenButton) {

        return;
    }


    if (
        elements.listenButton.dataset.bound ===
        "true"
    ) {

        return;
    }


    elements.listenButton.dataset.bound =
        "true";


    elements.listenButton.addEventListener(
        "click",
        speakSolution
    );

}


async function speakSolution() {

    const text =
        roverState.currentDisplayedSolution ||
        roverState.currentSolutionEnglish;


    if (!text) {

        console.warn(
            "[TTS] Nothing to speak."
        );

        return;
    }


    const language =
        roverState.currentLanguage;


    try {

        const languageCode =
            languages[language]?.speech ||
            "en-IN";


        const response =
            await fetch(
                "/api/tts",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text: text,

                        languageCode:
                            languageCode

                    })
                }
            );


        if (
            response.ok
        ) {

            const data =
                await response.json();


            if (
                data.success &&
                data.audioContent
            ) {

                const audio =
                    new Audio(
                        "data:audio/mp3;base64," +
                        data.audioContent
                    );


                await audio.play();

                return;
            }
        }

    } catch (error) {

        console.warn(
            "[TTS] Google TTS failed.",
            error
        );
    }


    /*
       Browser fallback.
    */

    browserSpeak(
        text,
        language
    );

}


function browserSpeak(
    text,
    language
) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        languages[language]?.speech ||
        "en-IN";


    utterance.rate =
        0.9;


    utterance.volume =
        1.0;


    window.speechSynthesis.speak(
        utterance
    );

}


/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

function setupImageUpload() {

    console.log(
        "[IMAGE] Setting up image upload..."
    );


    let fileInput =
        findElement(
            "#image-input",
            "#imageInput",
            "#file-input",
            "#fileInput",
            "input[type='file']"
        );


    const camera =
        getElements().camera;


    /*
       If HTML doesn't contain a file input,
       create one automatically.
    */

    if (!fileInput) {

        fileInput =
            document.createElement(
                "input"
            );


        fileInput.type =
            "file";


        fileInput.accept =
            "image/*";


        fileInput.id =
            "ag-rover-image-input";


        fileInput.style.display =
            "none";


        document.body.appendChild(
            fileInput
        );

    }


    /*
       Find existing Choose Image button.
    */

    let chooseButton =
        findButtonByText(
            [
                "Choose Image",
                "Choose image",
                "Choose File",
                "Choose file",
                "Upload Image",
                "Upload image"
            ]
        );


    /*
       If no button exists,
       create one.
    */

    if (!chooseButton && camera) {

        chooseButton =
            document.createElement(
                "button"
            );


        chooseButton.type =
            "button";


        chooseButton.textContent =
            "Choose Image";


        chooseButton.className =
            "image-button";


        /*
           Put it below camera.
        */

        camera.parentElement
            ?.appendChild(
                chooseButton
            );
    }


    /*
       Analyse button.
    */

    let analyseButton =
        findButtonByText(
            [
                "Analyse Image",
                "Analyze Image",
                "Analyse",
                "Analyze"
            ]
        );


    /*
       If no analyse button exists,
       create one.
    */

    if (!analyseButton && camera) {

        analyseButton =
            document.createElement(
                "button"
            );


        analyseButton.type =
            "button";


        analyseButton.textContent =
            "Analyse Image";


        analyseButton.className =
            "analyse-button";


        analyseButton.disabled =
            true;


        camera.parentElement
            ?.appendChild(
                analyseButton
            );
    }


    /*
       Choose image click.
    */

    if (
        chooseButton &&
        chooseButton.dataset.bound !==
        "true"
    ) {

        chooseButton.dataset.bound =
            "true";


        chooseButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                fileInput.click();

            }
        );

    }


    /*
       Image selected.
    */

    if (
        fileInput.dataset.bound !==
        "true"
    ) {

        fileInput.dataset.bound =
            "true";


        fileInput.addEventListener(
            "change",
            () => {

                const file =
                    fileInput.files?.[0];


                if (!file) {

                    return;
                }


                handleImageSelected(
                    file
                );

            }
        );

    }


    /*
       Analyse click.
    */

    if (
        analyseButton &&
        analyseButton.dataset.bound !==
        "true"
    ) {

        analyseButton.dataset.bound =
            "true";


        analyseButton.addEventListener(
            "click",
            analyseSelectedImage
        );

    }


    /*
       Store references.
    */

    window.agRoverFileInput =
        fileInput;

    window.agRoverAnalyseButton =
        analyseButton;

}


/* =========================================================
   FIND BUTTON BY TEXT
   ========================================================= */

function findButtonByText(
    names
) {

    const buttons =
        Array.from(
            document.querySelectorAll(
                "button"
            )
        );


    return buttons.find(
        button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            return names.some(
                name =>
                    text ===
                    name.toLowerCase()
            );
        }
    ) || null;

}


/* =========================================================
   IMAGE SELECTED
   ========================================================= */

function handleImageSelected(
    file
) {

    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        alert(
            "Please select an image file."
        );

        return;
    }


    /*
       Release previous preview.
    */

    if (
        roverState.selectedImageURL
    ) {

        URL.revokeObjectURL(
            roverState.selectedImageURL
        );
    }


    roverState.selectedImage =
        file;


    roverState.selectedImageURL =
        URL.createObjectURL(
            file
        );


    console.log(
        "[IMAGE] Selected:",
        file.name,
        file.size,
        file.type
    );


    /*
       Show preview.
    */

    showImagePreview(
        roverState.selectedImageURL
    );


    /*
       Enable analysis.
    */

    if (
        window.agRoverAnalyseButton
    ) {

        window.agRoverAnalyseButton.disabled =
            false;
    }


    /*
       Update filename.
    */

    updateSelectedFilename(
        file.name
    );


    addNotification(
        "Image selected",
        `${file.name} is ready for analysis.`,
        "success"
    );

}


/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

function showImagePreview(
    imageURL
) {

    const camera =
        getElements().camera;


    if (!camera) {

        console.warn(
            "[IMAGE] Camera container not found."
        );

        return;
    }


    /*
       Don't replace the entire dashboard.
       Only replace the camera content.
    */

    camera.innerHTML = "";


    const image =
        document.createElement(
            "img"
        );


    image.src =
        imageURL;


    image.alt =
        "Selected plant image";


    image.style.width =
        "100%";


    image.style.height =
        "100%";


    image.style.objectFit =
        "contain";


    image.style.display =
        "block";


    camera.appendChild(
        image
    );

}


/* =========================================================
   UPDATE FILENAME
   ========================================================= */

function updateSelectedFilename(
    filename
) {

    const candidates =
        Array.from(
            document.querySelectorAll(
                "*"
            )
        );


    const element =
        candidates.find(
            element => {

                const text =
                    element.textContent
                        ?.trim()
                        .toLowerCase();


                return (
                    text ===
                    "no image selected"
                );
            }
        );


    if (element) {

        element.textContent =
            filename;
    }

}


/* =========================================================
   ANALYSE IMAGE
   ========================================================= */

async function analyseSelectedImage() {

    const file =
        roverState.selectedImage;


    if (!file) {

        alert(
            "Please choose an image first."
        );

        return;
    }


    const button =
        window.agRoverAnalyseButton;


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Analysing...";
    }


    console.log(
        "[ROBOFLOW] Sending image:",
        file.name
    );


    try {

        const formData =
            new FormData();


        formData.append(
            "image",
            file
        );


        const response =
            await fetch(
                "/api/analyze",
                {
                    method: "POST",

                    body: formData
                }
            );


        const data =
            await response.json();


        console.log(
            "[ROBOFLOW RESULT]",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );
        }


        processAnalysisResult(
            data
        );


    } catch (error) {

        console.error(
            "[ROBOFLOW ERROR]",
            error
        );


        addNotification(
            "Image analysis failed",
            error.message,
            "error"
        );


        const elements =
            getElements();


        setText(
            elements.detection,
            "Analysis failed"
        );


        setText(
            elements.confidence,
            "—"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Analyse Image";
        }

    }

}


/* =========================================================
   PROCESS ROBOFLOW RESULT
   ========================================================= */

async function processAnalysisResult(
    data
) {

    /*
       No pest detected.
    */

    if (
        !data.detected
    ) {

        roverState.pestDetected =
            false;


        roverState.detection =
            null;


        roverState.confidence =
            0;


        const elements =
            getElements();


        setText(
            elements.detection,
            "No pest detected"
        );


        setText(
            elements.confidence,
            "—"
        );


        updateDetectionsList(
            data.predictions ||
            []
        );


        await updateSolutionCentre(
            "No pest was detected in the analysed image."
        );


        hideActionPanel();


        addNotification(
            "Analysis complete",
            "No pest was detected.",
            "success"
        );


        return;
    }


    /*
       Pest detected.
    */

    const pest =
        data.pest ||
        data.detection?.class ||
        "Unknown pest";


    const confidence =
        Number(
            data.confidencePercent ??
            (
                Number(
                    data.confidence ||
                    0
                ) * 100
            )
        );


    roverState.detection =
        pest;


    roverState.confidence =
        confidence;


    roverState.predictions =
        data.predictions ||
        [];


    roverState.pestDetected =
        true;


    const elements =
        getElements();


    setText(
        elements.detection,
        `${pest} detected on plant`
    );


    setText(
        elements.confidence,
        `${Math.round(confidence)}%`
    );


    updateDetectionsList(
        data.predictions ||
        []
    );


    const solution =
        data.solution ||
        generatePestSolution(
            pest
        );


    await updateSolutionCentre(
        solution
    );


    showActionPanel(
        pest,
        confidence
    );


    addNotification(
        "Pest detected",
        `${pest} detected with ${Math.round(confidence)}% confidence.`,
        "warning"
    );

}


/* =========================================================
   DETECTIONS LIST
   ========================================================= */

function updateDetectionsList(
    predictions
) {

    const elements =
        getElements();


    if (!elements.detections) {

        return;
    }


    if (
        !predictions ||
        predictions.length === 0
    ) {

        setText(
            elements.detections,
            "No detections."
        );

        return;
    }


    const sorted =
        [...predictions]
            .sort(
                (a, b) =>
                    Number(
                        b.confidence ||
                        0
                    ) -
                    Number(
                        a.confidence ||
                        0
                    )
            );


    elements.detections.innerHTML =
        "";


    sorted.forEach(
        prediction => {

            const name =
                prediction.class ||
                prediction.label ||
                "Unknown";


            const confidence =
                Math.round(
                    Number(
                        prediction.confidence ||
                        0
                    ) * 100
                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "detection-item";


            item.textContent =
                `${name} — ${confidence}%`;


            elements.detections.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   PEST SOLUTION FALLBACK
   ========================================================= */

function generatePestSolution(
    pestName
) {

    const key =
        String(pestName)
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
        solutions[key] ||
        `${pestName} has been detected on the plant. Inspect the affected area and apply an appropriate pest-control treatment.`
    );

}


/* =========================================================
   ACTION PANEL
   ========================================================= */

function showActionPanel(
    pestName,
    confidence
) {

    const elements =
        getElements();


    if (!elements.actionPanel) {

        createActionPanel();
    }


    const updated =
        getElements();


    setText(
        updated.actionTitle,
        "⚠ Pest detected"
    );


    setText(
        updated.actionMessage,
        `${pestName} detected with ${Math.round(confidence)}% confidence.`
    );


    setText(
        updated.actionQuestion,
        "Do you want to spray pesticide?"
    );


    if (
        updated.actionPanel
    ) {

        updated.actionPanel.style.display =
            "block";
    }


    setupSprayButtons();

}


/* =========================================================
   CREATE ACTION PANEL
   ========================================================= */

function createActionPanel() {

    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "action-panel";


    panel.className =
        "action-required";


    panel.innerHTML = `

        <div class="section-label">
            ACTION REQUIRED
        </div>

        <div
            id="action-title"
            class="action-title"
        >
            ⚠ Pest detected
        </div>

        <div
            id="action-message"
            class="action-message"
        >
        </div>

        <div
            id="action-question"
            class="action-question"
        >
            Do you want to spray pesticide?
        </div>

        <div class="action-buttons">

            <button
                id="spray-yes"
                class="spray-yes"
                type="button"
            >
                YES
            </button>

            <button
                id="spray-no"
                class="spray-no"
                type="button"
            >
                NO
            </button>

        </div>
    `;


    const solutionCentre =
        findElement(
            ".solution-centre",
            "#solution-centre",
            ".right-section"
        );


    if (solutionCentre) {

        solutionCentre.appendChild(
            panel
        );

    } else {

        document.body.appendChild(
            panel
        );
    }

}


/* =========================================================
   HIDE ACTION PANEL
   ========================================================= */

function hideActionPanel() {

    const elements =
        getElements();


    if (
        elements.actionPanel
    ) {

        elements.actionPanel.style.display =
            "none";
    }

}


/* =========================================================
   SPRAY BUTTONS
   ========================================================= */

function setupSprayButtons() {

    const elements =
        getElements();


    if (
        elements.yesButton &&
        elements.yesButton.dataset.bound !==
        "true"
    ) {

        elements.yesButton.dataset.bound =
            "true";


        elements.yesButton.addEventListener(
            "click",
            handleSprayYes
        );

    }


    if (
        elements.noButton &&
        elements.noButton.dataset.bound !==
        "true"
    ) {

        elements.noButton.dataset.bound =
            "true";


        elements.noButton.addEventListener(
            "click",
            handleSprayNo
        );

    }

}


/* =========================================================
   SPRAY YES
   ========================================================= */

async function handleSprayYes() {

    if (
        roverState.spraying
    ) {

        return;
    }


    roverState.spraying =
        true;


    const elements =
        getElements();


    if (
        elements.yesButton
    ) {

        elements.yesButton.disabled =
            true;
    }


    if (
        elements.noButton
    ) {

        elements.noButton.disabled =
            true;
    }


    roverState.movement =
        "Spraying";


    updateRoverStatus();


    addNotification(
        "Pesticide spray activated",
        "Sprayer will operate for 2 seconds.",
        "warning"
    );


    try {

        /*
           Current server endpoint:
           GET /api/rover/spray
        */

        const response =
            await fetch(
                `/api/rover/spray?esp32=${encodeURIComponent(getESP32BaseURL())}`,
                {
                    method: "GET"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Spray request failed"
            );
        }


        console.log(
            "[SPRAY]",
            data
        );


    } catch (error) {

        console.error(
            "[SPRAY ERROR]",
            error
        );


        addNotification(
            "Spray failed",
            error.message,
            "error"
        );

    }


    /*
       Wait for the physical spray cycle.
    */

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                2000
            )
    );


    roverState.spraying =
        false;


    roverState.movement =
        "Scanning";


    updateRoverStatus();


    if (
        elements.yesButton
    ) {

        elements.yesButton.disabled =
            false;
    }


    if (
        elements.noButton
    ) {

        elements.noButton.disabled =
            false;
    }


    hideActionPanel();


    addNotification(
        "Spraying complete",
        "Pesticide spray cycle completed.",
        "success"
    );

}


/* =========================================================
   SPRAY NO
   ========================================================= */

function handleSprayNo() {

    roverState.spraying =
        false;


    hideActionPanel();


    addNotification(
        "Pesticide spray cancelled",
        "No pesticide was sprayed.",
        "success"
    );

}


/* =========================================================
   ROVER STATUS
   ========================================================= */

function updateRoverStatus() {

    const elements =
        getElements();


    /*
       Bluetooth
    */

    if (
        elements.bluetooth
    ) {

        if (
            roverState.connected
        ) {

            elements.bluetooth.innerHTML =
                `<span class="status-dot"></span> Connected`;

            elements.bluetooth.style.color =
                "#36d67a";

        } else {

            elements.bluetooth.innerHTML =
                `● Disconnected`;

            elements.bluetooth.style.color =
                "#e05252";
        }
    }


    /*
       Mode
    */

    setText(
        elements.mode,
        roverState.mode
    );


    /*
       Movement
    */

    setText(
        elements.movement,
        roverState.movement
    );

}


/* =========================================================
   SENSOR DISPLAY
   ========================================================= */

function updateSensorReadings(
    left,
    front,
    right
) {

    roverState.sensor.left =
        normalizeSensorValue(left);


    roverState.sensor.front =
        normalizeSensorValue(front);


    roverState.sensor.right =
        normalizeSensorValue(right);


    const elements =
        getElements();


    setText(
        elements.leftSensor,
        formatSensor(
            roverState.sensor.left
        )
    );


    setText(
        elements.frontSensor,
        formatSensor(
            roverState.sensor.front
        )
    );


    setText(
        elements.rightSensor,
        formatSensor(
            roverState.sensor.right
        )
    );

}


function normalizeSensorValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return null;
    }


    return number;

}


function formatSensor(
    value
) {

    if (
        value === null
    ) {

        return "—";
    }


    return `${value} cm`;

}


/* =========================================================
   ROVER DATA POLLING
   ========================================================= */

function startRoverPolling() {

    /*
       Immediately check.
    */

    pollRoverData();


    /*
       Continue every 500 ms.
    */

    setInterval(
        pollRoverData,
        500
    );

}


/* =========================================================
   POLL ESP32 THROUGH NODE SERVER
   ========================================================= */

async function pollRoverData() {

    try {

        const response =
            await fetch(
                `/api/rover/data?esp32=${encodeURIComponent(getESP32BaseURL())}`,
                {
                    method: "GET",

                    cache: "no-store",

                    signal:
                        AbortSignal.timeout(
                            4000
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        /*
           ESP32 is reachable.
        */

        if (
            !roverState.connected
        ) {

            addNotification(
                "ESP32 connected",
                "Rover ESP32 is communicating with the dashboard.",
                "success"
            );
        }


        roverState.connected =
            true;


        /*
           Bluetooth status comes
           from the ESP32.
        */

        if (
            typeof data.bluetooth !==
            "undefined"
        ) {

            roverState.bluetooth =
                Boolean(
                    data.bluetooth
                );

        } else {

            /*
               If /data doesn't contain
               bluetooth, ESP32 reachability
               still confirms the board is online.
            */

            roverState.bluetooth =
                true;
        }


        /*
           Mode
        */

        if (
            data.mode !== undefined
        ) {

            roverState.mode =
                normalizeMode(
                    data.mode
                );
        }


        /*
           Movement/state
        */

        if (
            data.state !== undefined
        ) {

            roverState.movement =
                normalizeMovement(
                    data.state
                );

        } else if (
            data.movement !== undefined
        ) {

            roverState.movement =
                data.movement;

        } else if (
            data.message !== undefined
        ) {

            roverState.movement =
                data.message;
        }


        /*
           Sensors
        */

        const front =
            data.front ??
            data.frontDistance;


        const left =
            data.left ??
            data.leftDistance;


        const right =
            data.right ??
            data.rightDistance;


        updateSensorReadings(
            left,
            front,
            right
        );


        updateRoverStatus();


    } catch (error) {

        /*
           ESP32 is unreachable.
        */

        if (
            roverState.connected
        ) {

            addNotification(
                "ESP32 disconnected",
                "Dashboard can no longer reach the rover.",
                "error"
            );
        }


        roverState.connected =
            false;


        roverState.bluetooth =
            false;


        updateRoverStatus();


        console.warn(
            "[ESP32]",
            error.message
        );
    }

}


/* =========================================================
   NORMALIZE MODE
   ========================================================= */

function normalizeMode(
    mode
) {

    const value =
        String(mode);


    if (
        value.toLowerCase()
            .includes("manual")
    ) {

        return "Manual";
    }


    return "Automatic";

}


/* =========================================================
   NORMALIZE MOVEMENT
   ========================================================= */

function normalizeMovement(
    state
) {

    const value =
        String(state);


    const lower =
        value.toLowerCase();


    if (
        lower.includes("forward")
    ) {

        return "Moving Forward";
    }


    if (
        lower.includes("backward") ||
        lower.includes("reverse")
    ) {

        return "Moving Backward";
    }


    if (
        lower.includes("left")
    ) {

        return "Turning Left";
    }


    if (
        lower.includes("right")
    ) {

        return "Turning Right";
    }


    if (
        lower.includes("scan")
    ) {

        return "Scanning";
    }


    if (
        lower.includes("stop")
    ) {

        return "Stopped";
    }


    return value;

}


/* =========================================================
   ROVER DATA RECEIVER
   ========================================================= */

function receiveRoverData(
    data
) {

    if (!data) {

        return;
    }


    roverState.connected =
        true;


    if (
        data.bluetooth !==
        undefined
    ) {

        roverState.bluetooth =
            Boolean(
                data.bluetooth
            );
    }


    if (
        data.mode
    ) {

        roverState.mode =
            normalizeMode(
                data.mode
            );
    }


    updateSensorReadings(

        data.left ??
        data.leftDistance,

        data.front ??
        data.frontDistance,

        data.right ??
        data.rightDistance
    );


    if (
        data.state
    ) {

        roverState.movement =
            normalizeMovement(
                data.state
            );
    }


    updateRoverStatus();

}


/* =========================================================
   MOVEMENT HELPERS
   ========================================================= */

function setRoverMovement(
    movement
) {

    roverState.movement =
        movement;


    updateRoverStatus();

}


function roverTurningLeft() {

    setRoverMovement(
        "Turning Left"
    );

}


function roverTurningRight() {

    setRoverMovement(
        "Turning Right"
    );

}


function roverScanning() {

    setRoverMovement(
        "Scanning"
    );

}


/* =========================================================
   CLEAR NOTIFICATIONS
   ========================================================= */

function setupClearNotifications() {

    const button =
        findElement(
            "#clear-notifications"
        );


    if (
        button &&
        button.dataset.bound !==
        "true"
    ) {

        button.dataset.bound =
            "true";


        button.addEventListener(
            "click",
            clearNotifications
        );
    }

}


function clearNotifications() {

    const elements =
        getElements();


    if (
        !elements.notificationList
    ) {

        return;
    }


    elements.notificationList.innerHTML =
        "";


    addNotification(
        "Dashboard ready",
        "Waiting for rover and camera connection.",
        "success"
    );

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function addNotification(
    title,
    message,
    type = "success"
) {

    const elements =
        getElements();


    if (
        !elements.notificationList
    ) {

        return;
    }


    const item =
        document.createElement(
            "div"
        );


    item.className =
        `notification-item ${type}`;


    const icon =
        type === "error"
            ? "!"
            : type === "warning"
                ? "⚠"
                : "✓";


    item.innerHTML = `

        <div class="notification-icon">
            ${icon}
        </div>

        <div class="notification-content">

            <strong>
                ${escapeHTML(title)}
            </strong>

            <p>
                ${escapeHTML(message)}
            </p>

            <span>
                Just now
            </span>

        </div>

    `;


    elements.notificationList.prepend(
        item
    );


    /*
       Keep notifications manageable.
    */

    while (
        elements.notificationList
            .children.length > 10
    ) {

        elements.notificationList.lastElementChild
            ?.remove();
    }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


/* =========================================================
   CAMERA FEED
   ========================================================= */

function setCameraFeed(
    cameraURL
) {

    const camera =
        getElements().camera;


    if (!camera) {

        return;
    }


    camera.innerHTML = "";


    const image =
        document.createElement(
            "img"
        );


    image.src =
        cameraURL;


    image.alt =
        "ESP32-CAM Live Feed";


    image.style.width =
        "100%";


    image.style.height =
        "100%";


    image.style.objectFit =
        "cover";


    image.style.display =
        "block";


    camera.appendChild(
        image
    );

}


/* =========================================================
   COMPATIBILITY FUNCTIONS
   ========================================================= */

/*
   Your HTML currently uses inline onclick
   names in places, so keep these aliases.
*/

function readSolution() {

    speakSolution();

}


function confirmSpray() {

    handleSprayYes();

}


function cancelSpray() {

    handleSprayNo();

}


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.handlePestDetection =
    processAnalysisResult;


window.updateSensorReadings =
    updateSensorReadings;


window.setBluetoothStatus =
    function (connected) {

        roverState.connected =
            Boolean(connected);

        roverState.bluetooth =
            Boolean(connected);

        updateRoverStatus();
    };


window.setRoverMode =
    setRoverMode;


window.setRoverMovement =
    setRoverMovement;


window.roverTurningLeft =
    roverTurningLeft;


window.roverTurningRight =
    roverTurningRight;


window.roverScanning =
    roverScanning;


window.receiveRoverData =
    receiveRoverData;


window.setCameraFeed =
    setCameraFeed;


window.speakSolution =
    speakSolution;


window.readSolution =
    readSolution;


window.confirmSpray =
    confirmSpray;


window.cancelSpray =
    cancelSpray;


window.clearNotifications =
    clearNotifications;


/* =========================================================
   SET ROVER MODE
   ========================================================= */

function setRoverMode(
    mode
) {

    roverState.mode =
        normalizeMode(mode);


    updateRoverStatus();

}


/* =========================================================
   END
   ========================================================= */