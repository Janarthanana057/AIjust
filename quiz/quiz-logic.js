import { db } from '../firebase-config.js';
import { 
    collection, doc, setDoc, getDoc, onSnapshot, 
    query, orderBy, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let currentQIndex = 0;
let dailyQuestions = [];
let totalScore = 0;
let attempts = 1;
let quizActive = true; 

const userEmail = localStorage.getItem('userEmail');
const userName = localStorage.getItem('userName') || "Student";
const todayKey = new Date().toISOString().slice(0, 10);
const completionKey = `completed_${userEmail}_${todayKey}`;

// 1. INITIALIZE QUIZ
async function initQuiz() {
    if (!userEmail) {
        window.location.href = "../dashboard.html"; 
        return;
    }

    // Check for weekly reset before starting
    await checkGlobalWeeklyReset();

    if (localStorage.getItem(completionKey) === "true") {
        document.getElementById('q-text').innerText = "Quiz Completed, " + userName + "!";
        document.getElementById('options-box').innerHTML = `<p style="color:#ff9800; text-align:center;">You've already earned your points for today. See you tomorrow!</p>`;
        listenToGlobalLeaderboard();
        return;
    }

    try {
        const response = await fetch('english_questions_1424_unique_mixed_levels.json');
        const data = await response.json();
        
        // Select 4 questions based on date
        const start = (new Date().getDate() * 4) % data.questions.length;
        dailyQuestions = data.questions.slice(start, start + 4);
        
        renderQuestion();
        listenToGlobalLeaderboard();
    } catch (e) { 
        console.error("JSON Load Error:", e);
        document.getElementById('q-text').innerText = "Error loading questions.";
    }
}

// 2. WEEKLY RESET LOGIC
async function checkGlobalWeeklyReset() {
    const adminRef = doc(db, "admin", "settings"); 
    try {
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
            const data = adminSnap.data();
            const resetDate = data.nextResetDate.toDate();
            if (new Date() >= resetDate) {
                localStorage.setItem('cumulativeWeeklyScore', 0);
                const nextReset = new Date();
                nextReset.setDate(nextReset.getDate() + 7);
                await setDoc(adminRef, { nextResetDate: nextReset }, { merge: true });
            }
        }
    } catch (e) { console.error("Reset Check Error:", e); }
}

// 3. RENDER QUESTION
function renderQuestion() {
    const q = dailyQuestions[currentQIndex];
    const qText = document.getElementById('q-text');
    const box = document.getElementById('options-box');
    
    if(!qText || !box) return;

    qText.innerText = q.question;
    box.innerHTML = '';
    document.getElementById('feedback-msg').innerText = '';
    attempts = 1; 

    Object.keys(q.options).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="opt-key">${key}</span> ${q.options[key]}`;
        btn.onclick = () => handleAnswer(key, q.answer, q.topic);
        box.appendChild(btn);
    });
}

// 4. HANDLE ANSWER
function handleAnswer(selected, correct, topic) {
    if (!quizActive) return;

    const feedback = document.getElementById('feedback-msg');
    
    if (selected === correct) {
        let pointsEarned = Math.max(1, 6 - attempts);
        totalScore += pointsEarned;

        feedback.innerHTML = `CORRECT! ✅ +${pointsEarned} PTS`;
        feedback.style.color = "#39ff14"; 
        
        // Disable buttons
        const options = document.querySelectorAll('.option-btn');
        options.forEach(btn => btn.style.pointerEvents = 'none');

        setTimeout(() => {
            currentQIndex++;
            if (currentQIndex < dailyQuestions.length) {
                renderQuestion();
            } else {
                finishQuiz();
            }
        }, 1500); 
    } else {
        attempts++;
        feedback.innerText = "TRY AGAIN! ❌";
        feedback.style.color = "#ff3131"; 
    }
}

// 5. FINISH & SAVE
async function finishQuiz() {
    quizActive = false; 
    localStorage.setItem(completionKey, "true");

    const optionsBox = document.getElementById('options-box');
    if (optionsBox) optionsBox.style.display = 'none';
    document.getElementById('q-text').innerText = "Quiz Finished!";

    const weeklyTotal = saveWeeklyCumulativeScore(totalScore);

    // Streak Logic
    const today = new Date().toISOString().slice(0, 10);
    const lastPlayed = localStorage.getItem(`lastPlayed_${userEmail}`);
    let currentStreak = parseInt(localStorage.getItem(`streak_${userEmail}`)) || 0;

    if (lastPlayed === today) {
        // already counted today
    } else {
        if (lastPlayed) {
            const diff = Math.floor((new Date(today) - new Date(lastPlayed)) / (86400000));
            if (diff === 1) currentStreak++;
            else if (diff > 1) currentStreak = 1;
        } else {
            currentStreak = 1;
        }
    }

    // Show Result UI
    document.getElementById('feedback-msg').innerHTML = `
        <div style="border: 2px solid #39ff14; padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.9); text-align:center;">
            <p style="color: #ffeb3b; margin: 0;">Today: +${totalScore} pts</p>
            <h3 style="color: #03e9f4; margin: 10px 0;">WEEKLY PROGRESS</h3>
            <p style="font-size: 2.2rem; color: #39ff14; margin: 0;">${weeklyTotal} <span style="font-size: 1rem; color: #fff;">/ 140</span></p>
            <progress value="${weeklyTotal}" max="140" style="width: 100%; height: 12px;"></progress>
        </div>
    `;

    localStorage.setItem(`streak_${userEmail}`, currentStreak);
    localStorage.setItem(`lastPlayed_${userEmail}`, today);
    const streakEl = document.getElementById('streak-number');
    if(streakEl) streakEl.innerText = currentStreak;

    try {
        await setDoc(doc(db, "leaderboard", userEmail), {
            name: userName, 
            score: weeklyTotal, 
            streak: currentStreak, 
            timestamp: serverTimestamp()
        }, { merge: true });
    } catch (e) { console.error("Firebase Save Error:", e); }
}

// 6. HELPERS
function saveWeeklyCumulativeScore(pointsEarnedToday) {
    let cumulativeScore = parseInt(localStorage.getItem('cumulativeWeeklyScore')) || 0;
    cumulativeScore += pointsEarnedToday;
    localStorage.setItem('cumulativeWeeklyScore', cumulativeScore);
    return cumulativeScore;
}

function listenToGlobalLeaderboard() {
    const qAll = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(20));
    onSnapshot(qAll, (snapshot) => {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = ''; 
        
        let rank = 1;
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isCurrentUser = (doc.id === userEmail);
            
            tbody.innerHTML += `
                <tr class="${isCurrentUser ? 'highlight-row' : ''}">
                    <td>${rank === 1 ? '🏆' : rank}</td>
                    <td style="color: ${isCurrentUser ? '#39ff14' : '#03e9f4'};">
                        ${data.name} ${data.streak > 0 ? '🔥' + data.streak : ''}
                    </td>
                    <td>${data.score}</td>
                </tr>`;
            rank++;
        });
    });
}

// Start
initQuiz();