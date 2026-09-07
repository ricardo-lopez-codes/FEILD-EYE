# FEILD-EYE 🌿🤖
**Autonomous Agricultural Rover with AI Pest Detection & Precision Spraying**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen)](https://feild-eye.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-blue.svg)](https://nodejs.org/)

**Live Application Dashboard:** [https://feild-eye.onrender.com/](https://feild-eye.onrender.com/)

---

### **⚠️ Important Note for Evaluators & Users:**
**When the dashboard opens, you will be prompted to enter the IP addresses for the ESP32 Rover and ESP32-CAM. If you have the physical ESP32 and ESP32-CAM accessible on your local network, enter their assigned IP addresses. If you are testing or evaluating the live cloud demo without physical hardware connected, enter any dummy IP addresses (e.g., `192.168.1.100` and `192.168.1.101`) to dismiss the prompt and proceed to use the dashboard and AI pest analysis features.**[cite: 1, 3]

---

## 👥 Collaborators

* **Ricardo Lopez** - [@ricardo-lopez-codes](https://github.com/ricardo-lopez-codes)
* **Pradeep R** - [@pradeepr1319](https://github.com/pradeepr1319)
* **Joshua Ruben** - [@joshuaruben2209-stack](https://github.com/joshuaruben2209-stack)
* **Reykojr** - [@Reykojr](https://github.com/Reykojr)

---

## 📌 Project Overview

**FEILD-EYE** is an integrated IoT and Computer Vision agricultural robotics dashboard designed for modern smart farming. The system combines real-time hardware telemetry from an autonomous field rover, live video feed integration, multi-language speech accessibility, and automated plant disease/pest detection using Roboflow AI inference models[cite: 1, 2, 3].

### Key Capabilities
* **Live AI Pest Identification:** Upload plant photos to detect common agricultural pests (aphids, caterpillars, spider mites, mealybugs, whiteflies, thrips) with confidence metrics[cite: 1, 2].
* **Targeted Pesticide Actuation:** Prompts automated precision spot-spraying upon high-confidence detections to reduce chemical runoff[cite: 1, 2].
* **Multi-Language Accessibility:** Localized voice readout and translated advisory support for regional languages including English, Tamil, Hindi, Telugu, Kannada, and Malayalam[cite: 1, 2, 3].
* **Real-time Rover Telemetry:** Monitors obstacle distance sensors (Left, Front, Right), navigation status, connection health, and actuation relays over local network endpoints[cite: 1, 2, 3].

---

## 🏗️ Architecture
* **Frontend:** Responsive dashboard interface built with vanilla HTML5, CSS3, and ES6 JavaScript[cite: 1, 3].
* **Backend:** Express.js proxy server managing device polling, cross-origin requests, image preprocessing, and external API routing.
* **Inference Engine:** Roboflow Hosted Inference API using custom-trained agricultural pest models.
* **Embedded Controller:** ESP32 / ESP32-CAM running HTTP REST endpoints for ultrasonic telemetry, drive commands, and relay actuation[cite: 1, 2].

---

## 🚀 Live Demo & Evaluation Guide

* **Web UI & AI Inference:** The hosted deployment at [feild-eye.onrender.com](https://feild-eye.onrender.com/) is live 24/7. Evaluators can test the dashboard responsiveness, change languages, and use the **Choose Image** button to upload sample crop images for immediate pest classification and recommendations[cite: 1, 3].
* **Hardware Actuation & Video Stream:** Physical rover telemetry and real-time ESP32-CAM feeds operate via local network communication (`10.x.x.x` / `192.168.x.x`) during field operation[cite: 1, 2, 3]. When evaluating remotely without physical rover hardware connected to the cloud network, enter dummy IPs as instructed above; telemetry states will show disconnected while image inference remains fully functional[cite: 1, 2, 3].

---

## 🛠️ Local Installation & Setup

To run the full stack locally with direct ESP32 hardware connection:

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or later)
* ESP32 and ESP32-CAM connected to the same local Wi-Fi router or hotspot as your computer[cite: 1, 3].

### 1. Clone the Repository
```bash
git clone [https://github.com/ricardo-lopez-codes/FEILD-EYE.git](https://github.com/ricardo-lopez-codes/FEILD-EYE.git)
cd FEILD-EYE
