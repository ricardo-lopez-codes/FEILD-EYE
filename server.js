"use strict";

const roverState = {
    connected: false,
    bluetooth: false,
    mode: "Automatic",
    movement: "Scanning",
    sensor: { left: null, front: null, right: null },
    detection: null,
    confidence: 0,
    spraying: false,
    selectedImage: null,
    currentLanguage: "en",
    currentSolutionEnglish: "",
    currentDisplayedSolution: ""
};

const languages = {
    en: { name: "English", speech: "en-IN" },
    ta: { name: "Tamil", speech: "ta-IN" },
    hi: { name: "Hindi", speech: "hi-IN" },
    te: { name: "Telugu", speech: "te-IN" },
    kn: { name: "Kannada", speech: "kn-IN" },
    ml: { name: "Malayalam", speech: "ml-IN" }
};

const DEVICE_STORAGE_KEYS = {
    esp32: "ag_rover_esp32_ip",
    camera: "ag_rover_esp32_cam_ip"
};

function getDeviceIPs() {
    return {
        esp32: localStorage.getItem(DEVICE_STORAGE_KEYS.esp32) || "",
        camera: localStorage.getItem(DEVICE_STORAGE_KEYS.camera) || ""
    };
}

function getESP32BaseURL() {
    const ip = getDeviceIPs().esp32;
    return ip ? `http://${ip}` : "";
}

function getCameraStreamURL() {
    const ip = getDeviceIPs().camera;
    return ip ? `http://${ip}:81/stream` : "";
}

document.addEventListener("DOMContentLoaded", () => {
    setupDeviceConnectionPopup();
    setupLanguage();
    setupListenButton();
    setupSprayButtons();
    setupImageUpload();
    setupNotifications();
    startRoverPolling();
});

function setupDeviceConnectionPopup() {
    const modal = document.getElementById("connectionModal");
    const button = document.getElementById("connectDevicesBtn");
    const esp32Input = document.getElementById("esp32IpInput");
    const cameraInput = document.getElementById("esp32CamIpInput");
    const configBtn = document.getElementById("reopenConfigBtn");

    const ips = getDeviceIPs();
    if (esp32Input) esp32Input.value = ips.esp32;
    if (cameraInput) cameraInput.value = ips.camera;

    if (!ips.esp32 || !ips.camera) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
        activateCameraStream(getCameraStreamURL());
    }

    button.addEventListener("click", () => {
        const esp32 = esp32Input.value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const camera = cameraInput.value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/:81$/, "");

        if (!esp32 || !camera) {
            document.getElementById("connectionError").textContent = "Please fill in both IP addresses.";
            return;
        }

        localStorage.setItem(DEVICE_STORAGE_KEYS.esp32, esp32);
        localStorage.setItem(DEVICE_STORAGE_KEYS.camera, camera);

        modal.classList.add("hidden");
        activateCameraStream(getCameraStreamURL());
        addNotification("IPs Updated", `ESP32: ${esp32} | Camera: ${camera}`, "success");
        pollRoverData();
    });

    if (configBtn) {
        configBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    }
}

function activateCameraStream(url) {
    const stream = document.getElementById("cameraStream");
    const placeholder = document.getElementById("cameraPlaceholder");
    const preview = document.getElementById("imagePreview");

    if (!url) return;
    preview.style.display = "none";
    placeholder.style.display = "none";
    stream.style.display = "block";
    stream.src = url;
}

function setupImageUpload() {
    const chooseBtn = document.getElementById("chooseImageBtn");
    const fileInput = document.getElementById("imageInput");
    const analyzeBtn = document.getElementById("analyzeImageBtn");
    const imageName = document.getElementById("imageName");
    const preview = document.getElementById("imagePreview");
    const stream = document.getElementById("cameraStream");
    const placeholder = document.getElementById("cameraPlaceholder");

    chooseBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        roverState.selectedImage = file;
        imageName.textContent = file.name;
        analyzeBtn.disabled = false;

        stream.style.display = "none";
        placeholder.style.display = "none";
        preview.style.display = "block";
        preview.src = URL.createObjectURL(file);
    });

    analyzeBtn.addEventListener("click", async () => {
        if (!roverState.selectedImage) return;

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "Analysing...";

        const formData = new FormData();
        formData.append("image", roverState.selectedImage);

        try {
            const response = await fetch("/api/analyze", { method: "POST", body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Analysis failed");

            handleAnalysisResult(data);
        } catch (err) {
            addNotification("Analysis Failed", err.message, "error");
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = "Analyse Image";
        }
    });
}

async function handleAnalysisResult(data) {
    const detectionEl = document.getElementById("detection");
    const confidenceEl = document.getElementById("confidence");
    const detectionsListEl = document.getElementById("detections");
    const actionPanel = document.getElementById("action-panel");
    const actionMsg = document.getElementById("action-message");

    if (!data.detected) {
        detectionEl.textContent = "No pest detected";
        confidenceEl.textContent = "—";
        detectionsListEl.innerHTML = '<div style="color: #657069; font-size: 13px;">No pests detected.</div>';
        actionPanel.style.display = "none";
        await updateSolution("No pests were found on the plant.");
        return;
    }

    const pest = data.pest || "Pest";
    const confidence = Math.round(data.confidencePercent || (data.confidence * 100));

    detectionEl.textContent = `${pest} detected`;
    confidenceEl.textContent = `${confidence}%`;

    detectionsListEl.innerHTML = (data.predictions || []).map(p => `
        <div class="detection-item">
            <span>${p.class || p.label}</span>
            <span style="color:#35d56b; font-weight:700;">${Math.round(p.confidence * 100)}%</span>
        </div>
    `).join("");

    actionMsg.textContent = `${pest} detected with ${confidence}% confidence. Spray pesticide?`;
    actionPanel.style.display = "block";

    await updateSolution(data.solution || `Pest detected. Take prompt remediation.`);
}

function setupLanguage() {
    const select = document.getElementById("languageSelect");
    select.addEventListener("change", async (e) => {
        roverState.currentLanguage = e.target.value;
        if (roverState.currentSolutionEnglish) {
            await updateSolution(roverState.currentSolutionEnglish);
        }
    });
}

async function updateSolution(textEnglish) {
    roverState.currentSolutionEnglish = textEnglish;
    let translated = textEnglish;

    if (roverState.currentLanguage !== "en") {
        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textEnglish, targetLanguage: roverState.currentLanguage })
            });
            const data = await res.json();
            if (data.translatedText) translated = data.translatedText;
        } catch (e) {
            console.warn("Translation failed, using English:", e);
        }
    }

    roverState.currentDisplayedSolution = translated;
    document.getElementById("solution").textContent = translated;
}

function setupListenButton() {
    document.getElementById("listenButton").addEventListener("click", async () => {
        const text = roverState.currentDisplayedSolution || roverState.currentSolutionEnglish;
        if (!text) return;

        // Browser fallback speech synthesis
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languages[roverState.currentLanguage]?.speech || "en-IN";
            window.speechSynthesis.speak(utterance);
        }
    });
}

function setupSprayButtons() {
    const sprayYes = document.getElementById("sprayYes");
    const sprayNo = document.getElementById("sprayNo");
    const actionPanel = document.getElementById("action-panel");

    sprayYes.addEventListener("click", async () => {
        sprayYes.disabled = true;
        addNotification("Sprayer", "Sprayer activated for 2 seconds.", "warning");
        try {
            await fetch(`/api/rover/spray?esp32=${encodeURIComponent(getESP32BaseURL())}`);
        } catch (e) {
            addNotification("Spray Failed", e.message, "error");
        }
        setTimeout(() => {
            sprayYes.disabled = false;
            actionPanel.style.display = "none";
            addNotification("Sprayer", "Spray completed.", "success");
        }, 2000);
    });

    sprayNo.addEventListener("click", () => {
        actionPanel.style.display = "none";
    });
}

function startRoverPolling() {
    pollRoverData();
    setInterval(pollRoverData, 1000);
}

async function pollRoverData() {
    const esp32Base = getESP32BaseURL();
    if (!esp32Base) return;

    try {
        const res = await fetch(`/api/rover/data?esp32=${encodeURIComponent(esp32Base)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unreachable");
        const data = await res.json();

        updateTelemetry(true, data);
    } catch (e) {
        updateTelemetry(false, null);
    }
}

function updateTelemetry(connected, data) {
    const btEl = document.getElementById("bluetooth-status");
    const modeEl = document.getElementById("rover-mode");
    const moveEl = document.getElementById("rover-movement");
    const frontEl = document.getElementById("front-sensor");
    const leftEl = document.getElementById("left-sensor");
    const rightEl = document.getElementById("right-sensor");

    if (!connected) {
        btEl.textContent = "● Disconnected";
        btEl.style.color = "#e05252";
        return;
    }

    btEl.textContent = "● Connected";
    btEl.style.color = "#36d67a";

    if (data.mode) modeEl.textContent = data.mode;
    if (data.state || data.movement) moveEl.textContent = data.state || data.movement;
    frontEl.textContent = data.front !== undefined ? `${data.front} cm` : "—";
    leftEl.textContent = data.left !== undefined ? `${data.left} cm` : "—";
    rightEl.textContent = data.right !== undefined ? `${data.right} cm` : "—";
}

function setupNotifications() {
    document.getElementById("clearNotifications").addEventListener("click", () => {
        document.getElementById("notifications").innerHTML = "";
    });
}

function addNotification(title, msg, type = "success") {
    const container = document.getElementById("notifications");
    const div = document.createElement("div");
    div.className = `notification-item ${type}`;
    div.innerHTML = `<strong>${title}</strong>: ${msg}`;
    container.prepend(div);
}
