/* dashboard.js - Final Fixed Version with Video Switching */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";// --- 1. CONFIGURATION ---
const GROQ_API_KEY = "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"; 

const firebaseConfig = {
    apiKey: "AIzaSyAU0WgjsPvnEHboSvGJp0RH4hR3YNdURKg",
    authDomain: "justai-c92a6.firebaseapp.com",
    projectId: "justai-c92a6",
    storageBucket: "justai-c92a6.firebasestorage.app",
    messagingSenderId: "605893343508",
    appId: "1:605893343508:web:ef37642dd032c1381cea01"
};
// 3. FORGOT PASSWORD LOGIC
// This code only runs if the 'forgot-password' link exists on the page
// --- 1. PERSISTENT CONFIGURATION & MIDNIGHT RESET ---
const DAILY_LIMIT = 180; // 3 minutes in seconds
function checkPremiumStatus() {
    // 1. Check for Paid Secret Key
    const token = localStorage.getItem('_app_auth_token_z92');
    const secretValue = 'verified_premium_access_2025';
    
    // 2. Check for old accountType key
    const oldType = localStorage.getItem('accountType');
    
    // 3. NEW: Check for 1-Day Trial Status
    const trialStatus = localStorage.getItem('trialStatus');
    const trialStart = localStorage.getItem('trialStartTime');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in ms

    // Determine if trial is still active
    const isTrialValid = (trialStatus === 'active' && trialStart && (now - trialStart < oneDay));

    // Return true if PAID or TRIAL ACTIVE
    return token === secretValue || oldType === 'premium' || isTrialValid;
}
// Set the variable based on the check
let isPremium = checkPremiumStatus();
let conversationFeedback = []; 
let mistakesArray = [];       
const PREMIUM_PRICE_INR = "₹49";
let usageInterval = null; 

// Load existing time and date from browser storage
// Add this at the TOP of your script
// TOP OF dashboard.js
const today = new Date().toDateString(); 
let lastAccessDate = localStorage.getItem('lastAccessDate');
let timeUsedToday; // Define globally

if (lastAccessDate !== today) {
    timeUsedToday = 0;
    localStorage.setItem('timeUsedToday', '0'); // Save as string
    localStorage.setItem('lastAccessDate', today);
    console.log("New day! Timer reset.");
} else {
    // Load existing time on refresh
    timeUsedToday = parseInt(localStorage.getItem('timeUsedToday')) || 0;
}
// 1. SAFE INITIALIZATION
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}
const auth = getAuth(app);

// The 'forgotBtn' code is DELETED because it belongs in login.html, not here!
// this account chacking 
// Add this to your dashboard.js
const userAccount = localStorage.getItem('accountType');

if (userAccount === 'premium') {
    console.log("Welcome back, Premium User!");
    // Hide the limit timer if it's visible
    const timer = document.getElementById('reset-timer-container');
    if (timer) timer.style.display = 'none';
}


// --- 2. ELEMENTS ---
const avatarImg = document.getElementById('ai-avatar');
const genderSelect = document.getElementById('gender-select');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-session');
const micBtn = document.getElementById('start-session'); 
const endBtn = document.getElementById('end-session');
let selectedGender = "female";
let isSpeaking = false; 
document.addEventListener('DOMContentLoaded', () => {
    const trialBtnContainer = document.getElementById('trial-container');
    const statusText = document.getElementById('status-text');
    const trialStatus = localStorage.getItem('trialStatus');
    const userEmail = localStorage.getItem('userEmail');
    const adminTools = document.getElementById('test-controls');

    // 1. Show the "Confirm" button to EVERYONE if they are free users
    if (!checkPremiumStatus() && (!trialStatus || trialStatus === 'none')) {
        if (trialBtnContainer) trialBtnContainer.style.display = 'block';
    } else {
        // Hide if trial is active or they are already a paid member
        if (trialBtnContainer) trialBtnContainer.style.display = 'none';
    }

    // 2. Visual updates for Premium/Trial status
    if (checkPremiumStatus()) {
        const isTrialActive = localStorage.getItem('trialStatus') === 'active';
        
        if (isTrialActive && localStorage.getItem('accountType') !== 'premium') {
            statusText.innerText = "⚡ 1-Day Trial: Unlimited Access";
            statusText.style.color = "#03e9f4"; // Neon Cyan
        } else if (localStorage.getItem('accountType') === 'premium') {
            statusText.innerText = "⭐ Premium: Unlimited Access";
            statusText.style.color = "#ffeb3b"; // Gold
        }
    }

    // 3. Keep Admin Tools private to your test email
    if (userEmail === 'test2@galaxy.com' && adminTools) {
        adminTools.style.display = 'block';
    }
});
// --- NEW: AVATAR STATE SWITCHER ---
function setAvatarState(state) {
    const gender = genderSelect.value; 
    const wave = document.getElementById('voice-wave'); // Get the wave element
    
    // 1. Handle the Wave Animation
    if (state === 'speaking') {
        if (wave) wave.classList.add('active'); // Start the pulsing wave
    } else {
        if (wave) wave.classList.remove('active'); // Stop the wave when silent
    }

    // 2. Hide everything and stop videos
    document.querySelectorAll('.avatar-media, #ai-avatar').forEach(el => {
        el.style.display = 'none';
        if(el.tagName === 'VIDEO') {
            el.pause();
            el.currentTime = 0;
        }
    });

    // 3. Switch between Idle, Listening (Nodding), and Speaking
    if (state === 'idle') {
        avatarImg.style.display = 'block';
        avatarImg.src = `${gender}.png`;
    } 
    else if (state === 'listening') {
        const nodVid = document.getElementById(`${gender}-nod`);
        if(nodVid) {
            nodVid.style.display = 'block';
            nodVid.play();
        }
    } 
    else if (state === 'speaking') {
        const speakVid = document.getElementById(`${gender}-speak`);
        if(speakVid) {
            speakVid.style.display = 'block';
            speakVid.play();
        }
    }
}
// --- NEW: TIMER LOGIC ---
function startUsageTimer() {
    if (isPremium || usageInterval) return;

    usageInterval = setInterval(() => {
        if (isSpeaking || recognition.active) {
            timeUsedToday++;
            
            // SAVE TO BROWSER STORAGE IMMEDIATELY
            localStorage.setItem('timeUsedToday', timeUsedToday);

            if (timeUsedToday >= DAILY_LIMIT) {
                clearInterval(usageInterval);
                usageInterval = null;
                stopSessionForLimit();
            }
        }
    }, 1000);
}

// --- NEW: STOP SESSION & SHOW POPUP ---
// --- UPDATED: STOP SESSION & BLINKING POPUP ---
function stopSessionForLimit() {
    recognition.stop();
    window.speechSynthesis.cancel();
    setAvatarState('idle');
    
    // Stop the background timer
    if (usageInterval) {
        clearInterval(usageInterval);
        usageInterval = null;
    }

    // 1. Force the time to the limit and SAVE it
    timeUsedToday = DAILY_LIMIT;
    localStorage.setItem('timeUsedToday', timeUsedToday);

    // 2. UI Updates with BLINKING EFFECT
    statusText.innerText = "Daily limit reached!";
    statusText.classList.add('limit-blink'); 
    statusText.style.color = "#ff4d4d"; 
    
    // Switch buttons back to Start, but disable it
    document.getElementById('end-session').style.display = 'none';
    const startBtn = document.getElementById('start-session');
    startBtn.style.display = 'inline-block';
    startBtn.disabled = true;
    startBtn.innerText = "Limit Reached";

    // --- ADD THIS LINE HERE TO START THE CLOCK ---
    startResetCountdown();

    // 3. SHOW YOUR COLORFUL RAINBOW POPUP
    const modal = document.getElementById('premium-modal');
    if (modal) modal.style.display = 'flex';
}
// --- 3. SPEECH RECOGNITION SETUP ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US'; 
recognition.continuous = true; 
recognition.interimResults = false;

// --- 4. START BUTTON LOGIC ---
startBtn.addEventListener('click', () => {
    // Check if limit is already hit
    if (!isPremium && timeUsedToday >= DAILY_LIMIT) {
        stopSessionForLimit();
        return;
    }

    window.speechSynthesis.getVoices(); 
    try {
        recognition.start();
        
        // --- UPDATED UI LOGIC ---
        startBtn.style.display = 'none'; // Hide Start
        endBtn.style.display = 'inline-block'; // Show End
        
        statusText.innerText = "Active: Speak naturally...";
        setAvatarState('listening');
        
        // START THE TIMER HERE
        startUsageTimer();
    } catch (e) {
        console.error("Mic already started.");
    }
});

// --- 5. GENDER SWITCHER ---
genderSelect.addEventListener('change', () => {
    selectedGender = genderSelect.value;
    // Show the static image of the new gender
    setAvatarState('idle');
});
// --- 6. AI BRAIN (GROQ) ---
async function askGemini(userText) {
    statusText.innerText = "Thinking...";
    const url = "https://api.groq.com/openai/v1/chat/completions";
    
    try {
        const response = await fetch(url, {
            method: "POST", 
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        "role": "system", 
                        "content": "You are a helpful English tutor. Talk naturally. IMPORTANT: If the user makes a grammar/pronunciation mistake, end your reply with this format: [FIX: user_wrong_text | correct_full_sentence]" 
                    },
                    { "role": "user", "content": userText }
                ]
            })
        });

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        // Extract mistake for the Notebook
        const fixMatch = aiReply.match(/\[FIX: (.*?)\]/);
        if (fixMatch) {
            conversationFeedback.push(fixMatch[1]);
        }

        speak(aiReply.replace(/\[FIX: .*?\]/, "")); // Speak reply without showing the technical tag

    } catch (error) {
        statusText.innerText = "Network Error.";
    }
}

// --- 7. VOICE ENGINE (With Video Switching) ---
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const isTamil = /[\u0B80-\u0BFF]/.test(text);
    const voices = window.speechSynthesis.getVoices();

    // 1. Create a "Hard Filter" for Gender
    let filteredVoices = voices.filter(v => {
        const name = v.name.toLowerCase();
        if (selectedGender === 'female') {
            // Specifically look for female names or the Google female variant
            return name.includes("female") || name.includes("zira") || 
                   name.includes("sangeeta") || name.includes("google") || 
                   name.includes("samantha") || name.includes("natural");
        } else {
            return name.includes("male") || name.includes("david") || name.includes("ravi");
        }
    });

    // 2. Filter the gender-correct voices for the right Language
    let finalVoice = filteredVoices.find(v => 
        isTamil ? v.lang.startsWith('ta') : v.lang.startsWith('en')
    );

    // 3. Emergency Fallback: If no gender-specific Tamil voice exists, 
    // it stays on the English female voice to avoid switching to a Male voice.
    if (!finalVoice && isTamil && selectedGender === 'female') {
        finalVoice = filteredVoices.find(v => v.lang.startsWith('en'));
    }

    if (finalVoice) {
        utterance.voice = finalVoice;
    }
    
    utterance.lang = isTamil ? 'ta-IN' : 'en-US';

    utterance.onstart = () => {
        isSpeaking = true;
        recognition.stop(); 
        statusText.innerText = "AI Speaking...";
        setAvatarState('speaking');
    };

    utterance.onend = () => {
        isSpeaking = false;
        statusText.innerText = "Listening...";
        setAvatarState('listening');
        setTimeout(() => { try { recognition.start(); } catch(e) {} }, 500);
    };

    window.speechSynthesis.speak(utterance);
}
// --- 8. MICROPHONE RESULT HANDLING ---
recognition.onresult = (event) => {
    if (isSpeaking) return; 

    const lastResult = event.results[event.results.length - 1];
    if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        if (transcript.length > 1) {
            statusText.innerText = "You: " + transcript;
            askGemini(transcript); 
        }
    }
};

recognition.onend = () => {
    if (!isSpeaking) {
        try { recognition.start(); } catch(e) {}
    }
};
// forget password////

// --- 9. AUTH & EXTRAS ---
// --- 9. AUTH & EXTRAS ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html"; 
    } else {
        console.log("Logged in as:", user.email);
        
        isPremium = checkPremiumStatus(); 

        if (isPremium || user.email === "test1@galaxy.com") {
            isPremium = true; 
            console.log("Premium Access Verified.");

            // --- ADD THESE TWO LINES TO FIX THE TEXT ---
            statusText.innerText = "⭐ Premium: Unlimited Access"; 
            statusText.style.color = "#ffeb3b"; 

            const modal = document.getElementById('premium-modal');
            const timerUI = document.getElementById('reset-timer-container');
            if (modal) modal.style.display = 'none';
            if (timerUI) timerUI.style.display = 'none';

            // Admin Button Logic
            if (user.email === "test1@galaxy.com" && !document.getElementById('admin-reset-btn')) {
                const resetBtn = document.createElement('button');
                resetBtn.id = 'admin-reset-btn';
                resetBtn.innerText = "Admin: Reset 3-Min Timer";
                resetBtn.style.cssText = "position:fixed; bottom:10px; right:10px; z-index:9999; padding:10px; background:yellow; color:black; border:none; border-radius:5px; cursor:pointer; font-weight:bold;";
                
                resetBtn.onclick = () => {
                    timeUsedToday = 0;
                    localStorage.setItem('timeUsedToday', 0); 
                    startBtn.style.display = 'block';
                    startBtn.disabled = false;
                    startBtn.innerText = "▶ START HANDS-FREE SESSION";
                    statusText.innerText = "Admin: Timer Reset for Testing!";
                    statusText.style.color = "white";
                    if (modal) modal.style.display = 'none';
                };
                document.body.appendChild(resetBtn);
            }
        } else {
            isPremium = false;
            console.log("Free Account Detected.");
            
            // --- ENSURE FREE TEXT IS SET CORRECTLY ---
            statusText.innerText = "Free Account (5-min limit)";
            statusText.style.color = "#ffffff";

            const timeLeft = Math.max(0, DAILY_LIMIT - timeUsedToday);
            if (timeLeft <= 0) {
                stopSessionForLimit(); 
            }
        }
    }
});
if(micBtn) {
    micBtn.addEventListener('dblclick', () => {
        recognition.stop();
        statusText.innerText = "Processing immediately...";
    });
}
// ... existing code (Auth, Recognition, Speak function, etc.)

// --- 10. VOICE PRE-LOADING ---
// Paste it here at the very end of the file
window.speechSynthesis.onvoiceschanged = () => {
    console.log("System voices loaded and ready.");
    window.speechSynthesis.getVoices();
};

// --- NEW: POPUP BUTTON CLICKS ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal')) {
        document.getElementById('premium-modal').style.display = 'none';
    }
});

// NEW: Handles all three plans from your sketch
// Force the function to be global so onclick works
window.buyPlan = function(planType) {
    console.log("Plan clicked:", planType); // This helps you see if it's working
    let paymentUrl = "";

    const links = {
        '1month': "https://rzp.io/rzp/Ky3z8RP8",
        '6month': "https://rzp.io/rzp/sY5c5Bxn",
        '1year': "https://rzp.io/rzp/hVTal9Q9"
    };

    paymentUrl = links[planType];

    if (paymentUrl) {
        console.log("Redirecting to:", paymentUrl);
        window.location.href = paymentUrl; // Best for mobile & RuPay
    } else {
        alert("Please select a valid plan.");
    }
};

const notebook = document.getElementById('notebook-container');

// When user clicks END SESSION
// Function for when user manually clicks END SESSION
endBtn.onclick = () => {
    recognition.stop();
    window.speechSynthesis.cancel();
    setAvatarState('idle');
    
    endBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
    statusText.innerText = "Waiting for you to start...";

    if (isPremium) {
        notebook.style.display = 'block';
        showFinalCorrection('feedback-list');
    } else {
        // Force hide notebook for free users
        notebook.style.display = 'none'; 
        document.getElementById('premium-modal').style.display = 'flex';
    }
};

// NEW: END SESSION LOGIC
// --- Updated End Session Logic ---
function stopEverything() {
    recognition.stop();
    window.speechSynthesis.cancel();
    setAvatarState('idle');
    
    // --- ADD THIS LINE TO STOP THE TIMER ---
    if (usageInterval) { 
        clearInterval(usageInterval); 
        usageInterval = null; 
    }

    document.getElementById('end-session').style.display = 'none';
    document.getElementById('start-session').style.display = 'inline-block';

    if (isPremium) {
    document.getElementById('notebook-container').style.display = 'block';
    statusText.innerText = "Session Ended! Click below for your summary.";
    // Ensure this calls your notebook filler function
    showFinalCorrection('clean-feedback-list'); 
    } else {
        // FREE: Show the ₹49 Modal and hide the dashboard box
        document.getElementById('premium-modal').style.display = 'flex';
        document.getElementById('notebook-container').style.display = 'none';
    }
}
// Run this immediately when the page loads
function checkInitialLimit() {
    const savedTime = localStorage.getItem('timeUsedToday');
    if (savedTime) {
        timeUsedToday = parseInt(savedTime);
    }

    // If they are not premium and already hit the limit, block them now
    if (!isPremium && timeUsedToday >= DAILY_LIMIT) {
        startBtn.disabled = true;
        startBtn.innerText = "Daily Limit Reached";
        document.getElementById('premium-modal').style.display = 'flex';
    }
}

checkInitialLimit(); // Execute the check
// --- Open Clean Window Logic ---
window.openCorrectionDetails = function() {
    const list = document.getElementById('clean-feedback-list');
    list.innerHTML = ""; // Clear old data

    if (conversationFeedback.length === 0) {
        list.innerHTML = "<p style='text-align:center;'>No mistakes! Perfect English. 🌟</p>";
    } else {
        conversationFeedback.forEach(item => {
            const [wrong, right] = item.split('|');
            list.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,255,0,0.05); border-radius: 12px;">
                    <p style="color:#ff4d4d; margin:0;">❌ Wrong: ${wrong}</p>
                    <p style="color:#00ff00; margin:5px 0; font-weight:bold;">✅ Correct: ${right}</p>
                    <button onclick="speakText('${right.trim().replace(/'/g, "\\'")}')" style="background:#03e9f4; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🔊 Listen</button>
                </div>`;
        });
    }

    // Hide payment modal if open, show correction window
    document.getElementById('premium-modal').style.display = 'none';
    document.getElementById('correction-window').style.display = 'flex';
};

// Keep this function! It handles the "Listen" button in your corrections
window.speakText = function(text) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-GB'; 
    speech.rate = 0.8; 
    window.speechSynthesis.speak(speech);
};

// --- ADD THE NEW CODE BELOW THIS LINE ---

window.loginUser = function() {
    const emailField = document.getElementById('email-field');
    if (!emailField) return;

    const emailInput = emailField.value.toLowerCase().trim();
    
    // Pattern for Standard Mails
    const standardEmailPattern = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|hotmail\.com|emaxasp\.com)$/;
    const isTestingEmail = (emailInput === "test@galaxy.com");

    if (standardEmailPattern.test(emailInput) || isTestingEmail) {
        localStorage.setItem('userEmail', emailInput);
        localStorage.setItem('userName', emailInput.split('@')[0]);

        // Assign account types for testing and original mail
        if (isTestingEmail || emailInput === "test1@galaxy.com") {
            localStorage.setItem('accountType', 'admin');
        } else {
            localStorage.setItem('accountType', 'student');
        }

        window.location.href = "quiz.html"; 
    } else {
        alert("Access Denied: Please use a valid email or your testing account.");
    }
};

window.logoutUser = function() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('accountType');
    location.reload(); 
};

window.closeCorrectionWindow = function() {
    // 1. Hide the correction window
    document.getElementById('correction-window').style.display = 'none';
    
    // 2. Clear the old feedback so it doesn't repeat in the next session
    conversationFeedback = []; 

    if (isPremium) {
        // 3. Hide the small 'See Corrections' pill on the dashboard
        document.getElementById('notebook-container').style.display = 'none';
        
        // 4. Reset status text to the original state
        statusText.innerText = "Waiting for you to start...";
        statusText.style.color = "white"; 
    }
};
window.closeModal = function() {
    document.getElementById('premium-modal').style.display = 'none';
};
// Helper to fill the lists
function showFinalCorrection(containerId) {
    const list = document.getElementById(containerId);
    list.innerHTML = "";
    conversationFeedback.forEach(item => {
        const [wrong, right] = item.split('|');
        list.innerHTML += `
            <div class="correction-item">
                <p style="color:#ff4d4d;">❌ ${wrong}</p>
                <p style="color:#00ff00;">✅ ${right} <button onclick="speak('${right}')">🔊</button></p>
            </div>`;
    });
}

/*  TIME LIMIT TIMER */
function startResetCountdown() {
    const container = document.getElementById('reset-timer-container');
    const clock = document.getElementById('countdown-clock');
    
    container.style.display = 'block'; // Make it visible

    const updateClock = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Target 12:00 AM

        const diff = midnight - now;

        if (diff <= 0) {
            location.reload(); // Refresh the page at midnight to reset everything
            return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        // Format as 00h 00m 00s
        clock.innerText = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    };

    updateClock(); // Run once immediately
    setInterval(updateClock, 1000); // Update every second
}
// Add this at the bottom of dashboard.js
if (timeUsedToday >= DAILY_LIMIT) {
    startResetCountdown();
}
// non primum account to primum account//
// Function to Upgrade the Account
window.activatePremium = function() {
    localStorage.setItem('accountType', 'premium'); // Save status
    alert("Congratulations! You are now a Premium Member.");
    location.reload(); // Refresh to unlock everything
};

// Update your limit check to respect Premium status
function checkLimit() {
    // Check if user is premium
    const isPremium = localStorage.getItem('accountType') === 'premium';

    // If they are premium, STOP here and don't trigger the limit modal
    if (isPremium) {
        console.log("Premium user detected. Limits disabled.");
        return; 
    }

    // Otherwise, check the 5-minute limit
    if (timeUsedToday >= DAILY_LIMIT) {
        stopSessionForLimit();
    }
}
//register.js//
// Inside your registration success logic
function handleSignupSuccess() {
    // 1. Force the new user to be 'free' by default
    localStorage.setItem('accountType', 'free');
    
    // 2. Clear any old session time for the new user
    localStorage.setItem('timeUsedToday', 0);
    
    // 3. Redirect to login
    window.location.href = 'login.html';
}
document.addEventListener('DOMContentLoaded', () => {
    // 1. Look for the Secret Key
    const hasSecretKey = localStorage.getItem('_app_auth_token_z92') === 'verified_premium_access_2025';
    
    // 2. Look for the old account type
    const isPremiumStatus = localStorage.getItem('accountType') === 'premium';

    // 3. Update the 'isPremium' variable for the whole script
    isPremium = (hasSecretKey || isPremiumStatus);

    if (isPremium) {
        // --- PREMIUM MODE ---
        console.log("⭐ Premium Account Verified.");
        document.getElementById('premium-modal').style.display = 'none';
        document.getElementById('reset-timer-container').style.display = 'none';
        statusText.innerText = "⭐ Premium: Unlimited Access";
        statusText.style.color = "#ffeb3b";
    } else {
        // --- FREE MODE ---
        console.log("⏳ Free Account Mode.");
        statusText.innerText = "Free Account (5-min limit)";
        statusText.style.color = "#ffffff";
    }
});



