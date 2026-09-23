let selectedScanType = "message";


/* ================= MOBILE MENU ================= */

function toggleMobileMenu() {

    const menu = document.getElementById("mobileNav");

    menu.classList.toggle("active");
}


/* ================= SCAN TYPE ================= */

function selectScanType(button) {

    document.querySelectorAll(".scan-tab").forEach(tab => {
        tab.classList.remove("active");
    });

    button.classList.add("active");

    selectedScanType = button.dataset.type;

    const label = document.getElementById("scannerLabel");
    const input = document.getElementById("scamInput");

    const placeholders = {

        message:
            "Paste a suspicious SMS, WhatsApp message or social media message...",

        url:
            "Paste a suspicious URL, for example https://example.com/...",

        email:
            "Paste the suspicious email content here...",

        phone:
            "Enter a suspicious phone number or describe the call...",

        payment:
            "Paste a suspicious UPI or payment request here..."
    };

    const labels = {

        message:
            "Paste a suspicious message",

        url:
            "Paste a suspicious website URL",

        email:
            "Paste a suspicious email",

        phone:
            "Enter suspicious phone information",

        payment:
            "Paste a suspicious payment request"
    };

    label.textContent = labels[selectedScanType];

    input.placeholder = placeholders[selectedScanType];
}


/* ================= ANALYZE ================= */

async function analyzeScam() {

    const input = document.getElementById("scamInput");
    const resultBox = document.getElementById("resultBox");
    const analyzeButton = document.querySelector(".analyze-btn");

    const content = input.value.trim();

    if (!content) {

        resultBox.style.display = "block";

        resultBox.innerHTML = `
            <div style="
                padding:20px;
                color:#ffbdc4;
                background:#261117;
                border-radius:10px;
            ">
                ⚠️ Please enter something to analyze.
            </div>
        `;

        return;
    }


    analyzeButton.disabled = true;

    analyzeButton.innerHTML = "⏳ Analyzing...";


    try {

        const response = await fetch("/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                content: content,
                scan_type: selectedScanType
            })

        });


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message || "Unable to analyze content."
            );
        }


        showResult(data.result);

        loadStats();

    }
    catch (error) {

        resultBox.style.display = "block";

        resultBox.innerHTML = `
            <div style="
                padding:20px;
                color:#ffbdc4;
                background:#261117;
                border:1px solid #57232d;
                border-radius:10px;
            ">
                ❌ ${error.message}
            </div>
        `;

    }
    finally {

        analyzeButton.disabled = false;

        analyzeButton.innerHTML =
            "<span>🤖</span> Analyze with AI";
    }
}


/* ================= DISPLAY RESULT ================= */

function showResult(result) {

    const resultBox =
        document.getElementById("resultBox");

    const riskTitle =
        document.getElementById("riskTitle");

    const riskBadge =
        document.getElementById("riskBadge");

    const riskScore =
        document.getElementById("riskScore");

    const threatType =
        document.getElementById("threatType");

    const assessment =
        document.getElementById("assessment");

    const signalsList =
        document.getElementById("signalsList");

    const recommendationList =
        document.getElementById("recommendationList");


    resultBox.style.display = "block";


    riskTitle.textContent =
        result.risk_level === "HIGH RISK"
            ? "Potential scam indicators detected"
            : result.risk_level === "SUSPICIOUS"
                ? "Some suspicious indicators detected"
                : "No major scam indicators detected";


    riskBadge.textContent =
        result.risk_level;

    riskBadge.className =
        "risk-badge " + result.risk_class;


    riskScore.textContent =
        result.score;


    threatType.textContent =
        result.threat_type;


    assessment.textContent =
        result.risk_level;


    signalsList.innerHTML = "";

    result.signals.forEach(signal => {

        const li = document.createElement("li");

        li.textContent = signal;

        signalsList.appendChild(li);
    });


    recommendationList.innerHTML = "";

    result.recommendations.forEach(item => {

        const li = document.createElement("li");

        li.textContent = item;

        recommendationList.appendChild(li);
    });


    resultBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


/* ================= CLEAR ================= */

function clearScanner() {

    document.getElementById("scamInput").value = "";

    const resultBox =
        document.getElementById("resultBox");

    resultBox.style.display = "none";
}


/* ================= STATS ================= */

async function loadStats() {

    try {

        const response =
            await fetch("/stats");

        const data =
            await response.json();

        if (data.success) {

            document.getElementById("totalScans")
                .textContent =
                data.total_scans + "+";

            document.getElementById("threatsDetected")
                .textContent =
                data.threats_detected + "+";
        }

    }
    catch (error) {

        console.log(
            "Statistics unavailable."
        );
    }
}


/* ================= REPORT MODAL ================= */

function openReport() {

    document.getElementById("reportModal")
        .classList.add("active");

    document.getElementById("mobileNav")
        .classList.remove("active");
}


function closeReport() {

    document.getElementById("reportModal")
        .classList.remove("active");
}


/* ================= REPORT SUBMIT ================= */

async function submitReport() {

    const name =
        document.getElementById("reportName").value.trim();

    const email =
        document.getElementById("reportEmail").value.trim();

    const category =
        document.getElementById("reportCategory").value.trim();

    const description =
        document.getElementById("reportDescription").value.trim();

    const message =
        document.getElementById("reportMessage");


    if (!category || !description) {

        message.style.color = "#ff7080";

        message.textContent =
            "⚠️ Please select a category and enter a description.";

        return;
    }


    try {

        const response = await fetch("/report", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                name: name,
                email: email,
                category: category,
                description: description

            })

        });


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Report submission failed."
            );
        }


        message.style.color = "#43df98";

        message.textContent =
            "✅ " + data.message;


        document.getElementById("reportName").value = "";
        document.getElementById("reportEmail").value = "";
        document.getElementById("reportCategory").value = "";
        document.getElementById("reportDescription").value = "";

    }
    catch (error) {

        message.style.color = "#ff7080";

        message.textContent =
            "❌ " + error.message;
    }
}


/* ================= FAQ ================= */

function toggleFAQ(button) {

    const item =
        button.parentElement;

    const isOpen =
        item.classList.contains("open");


    document.querySelectorAll(".faq-item")
        .forEach(faq => {

            faq.classList.remove("open");

            const span =
                faq.querySelector("button span");

            span.textContent = "+";
        });


    if (!isOpen) {

        item.classList.add("open");

        const span =
            button.querySelector("span");

        span.textContent = "−";
    }
}


/* ================= MODAL CLICK OUTSIDE ================= */

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("reportModal");

    if (event.target === modal) {

        closeReport();
    }

});


/* ================= PAGE LOAD ================= */

document.addEventListener("DOMContentLoaded", function() {

    loadStats();

});
/* ================= KNOW THE SCAMS ================= */

const threatData = {

    banking: {
        icon: "🏦",
        title: "Banking Scams",
        description:
            "Scammers may pretend to be banks, customer-support staff or security teams and create urgency to obtain sensitive information or money.",
        warnings: [
            "Unexpected calls or messages about account problems",
            "Requests for OTP, PIN, CVV or password",
            "Pressure to act immediately",
            "Requests to transfer money"
        ],
        safety: [
            "Contact your bank using its official website or app",
            "Never share OTP, PIN or password",
            "Do not follow unexpected banking links",
            "Verify unusual requests independently"
        ]
    },


    phishing: {
        icon: "🔗",
        title: "Phishing",
        description:
            "Phishing uses fake websites, emails or messages that imitate trusted organizations to trick people into revealing information.",
        warnings: [
            "Suspicious website addresses",
            "Urgent verification requests",
            "Unexpected login links",
            "Requests for personal information"
        ],
        safety: [
            "Check the complete website address",
            "Use official websites directly",
            "Avoid clicking unexpected links",
            "Verify the sender before responding"
        ]
    },


    job: {
        icon: "💼",
        title: "Job Scams",
        description:
            "Fake job offers may promise easy income and then request registration fees, deposits or personal information.",
        warnings: [
            "Guaranteed job or salary claims",
            "Requests for upfront fees",
            "Recruiter avoids normal interview process",
            "Requests for sensitive documents too early"
        ],
        safety: [
            "Research the company independently",
            "Never pay to receive a job",
            "Verify recruiters through official channels",
            "Do not send unnecessary personal documents"
        ]
    },


    investment: {
        icon: "📈",
        title: "Investment Scams",
        description:
            "Investment scams often use unrealistic profit claims, fake trading platforms or pressure to deposit money quickly.",
        warnings: [
            "Guaranteed or unusually high returns",
            "Pressure to invest immediately",
            "Requests for additional deposits",
            "Unknown investment platforms"
        ],
        safety: [
            "Research the company and platform",
            "Be cautious of guaranteed returns",
            "Do not send money based only on social-media messages",
            "Verify financial services through official sources"
        ]
    },


    lottery: {
        icon: "🎁",
        title: "Lottery Scams",
        description:
            "A message claims you won a prize even though you did not enter, then asks for fees or personal information.",
        warnings: [
            "Unexpected prize notification",
            "Processing or tax fee request",
            "Pressure to respond quickly",
            "Requests for banking information"
        ],
        safety: [
            "Do not pay to claim an unexpected prize",
            "Do not share financial information",
            "Verify the promotion independently",
            "Ignore unsolicited prize messages"
        ]
    },


    upi: {
        icon: "💳",
        title: "UPI / Payment Scams",
        description:
            "Payment scams may use fake support messages, payment requests or social engineering to persuade users to send money.",
        warnings: [
            "Unexpected payment request",
            "Pressure to approve a transaction",
            "Requests for UPI PIN",
            "Fake customer-support claims"
        ],
        safety: [
            "Never share your UPI PIN",
            "Verify the recipient before paying",
            "Do not approve unknown payment requests",
            "Use official payment-app support"
        ]
    },


    social: {
        icon: "📱",
        title: "Social Media Scams",
        description:
            "Scammers may use fake profiles, impersonation, giveaways or direct messages to obtain money or information.",
        warnings: [
            "New or suspicious account",
            "Requests to move conversation elsewhere",
            "Unexpected money requests",
            "Too-good-to-be-true offers"
        ],
        safety: [
            "Verify the profile independently",
            "Avoid sending money to unknown contacts",
            "Use platform reporting tools",
            "Enable account security settings"
        ]
    },


    shopping: {
        icon: "🛒",
        title: "Shopping Scams",
        description:
            "Fake online stores may advertise extreme discounts, collect payment and fail to deliver the promised product.",
        warnings: [
            "Prices far below normal market prices",
            "Unknown shopping website",
            "No reliable contact information",
            "Only unusual payment methods available"
        ],
        safety: [
            "Research the seller before paying",
            "Check the website address carefully",
            "Prefer trusted payment methods",
            "Look for reliable independent reviews"
        ]
    }

};


/* Open scam details */

function openThreat(type) {

    const threat = threatData[type];

    if (!threat) {
        return;
    }

    document.getElementById("threatModalIcon")
        .textContent = threat.icon;

    document.getElementById("threatModalTitle")
        .textContent = threat.title;

    document.getElementById("threatModalDescription")
        .textContent = threat.description;


    const warningList =
        document.getElementById("threatWarningList");

    warningList.innerHTML = "";

    threat.warnings.forEach(item => {

        const li = document.createElement("li");

        li.textContent = item;

        warningList.appendChild(li);
    });


    const safetyList =
        document.getElementById("threatSafetyList");

    safetyList.innerHTML = "";

    threat.safety.forEach(item => {

        const li = document.createElement("li");

        li.textContent = item;

        safetyList.appendChild(li);
    });


    document.getElementById("threatModal")
        .classList.add("active");

}


/* Close scam details */

function closeThreat() {

    document.getElementById("threatModal")
        .classList.remove("active");
}


/* Go to scanner */

function goToScanner() {

    closeThreat();

    document.getElementById("scanner")
        .scrollIntoView({
            behavior: "smooth"
        });
}


/* Close modal when clicking outside */

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("threatModal");

    if (event.target === modal) {

        closeThreat();
    }

});
/* =========================================================
   SCAMCHAIN AI - REAL AUTHENTICATION
========================================================= */

let loginMode = true;


/* ================= OPEN LOGIN ================= */

function openAuth() {

    document.getElementById("authModal")
        .classList.add("active");

}


/* ================= CLOSE LOGIN ================= */

function closeAuth() {

    document.getElementById("authModal")
        .classList.remove("active");

}


/* ================= SWITCH LOGIN / SIGNUP ================= */

function switchAuthMode() {

    loginMode = !loginMode;

    const title =
        document.getElementById("authTitle");

    const subtitle =
        document.getElementById("authSubtitle");

    const submitBtn =
        document.getElementById("authSubmitBtn");

    const switchBtn =
        document.getElementById("switchAuthBtn");

    const signupNameBox =
        document.getElementById("signupNameBox");


    document.getElementById("authMessage")
        .textContent = "";


    if (loginMode) {

        title.textContent = "Login";

        subtitle.textContent =
            "Login to access your ScamChain AI dashboard.";

        submitBtn.textContent = "Login";

        switchBtn.textContent =
            "Create a new account";

        signupNameBox.style.display =
            "none";

    } else {

        title.textContent =
            "Create Account";

        subtitle.textContent =
            "Create your ScamChain AI account.";

        submitBtn.textContent =
            "Create Account";

        switchBtn.textContent =
            "Already have an account? Login";

        signupNameBox.style.display =
            "block";
    }
}


/* ================= LOGIN / SIGNUP ================= */

async function submitAuth() {

    const email =
        document.getElementById("authEmail")
            .value.trim();

    const password =
        document.getElementById("authPassword")
            .value;

    const message =
        document.getElementById("authMessage");


    if (!email || !password) {

        message.style.color =
            "#ff7080";

        message.textContent =
            "Please enter email and password.";

        return;
    }


    let url = "/api/login";

    let data = {
        email: email,
        password: password
    };


    /* SIGNUP */

    if (!loginMode) {

        const name =
            document.getElementById("authName")
                .value.trim();


        if (!name) {

            message.style.color =
                "#ff7080";

            message.textContent =
                "Please enter your name.";

            return;
        }


        url = "/api/register";

        data = {

            name: name,
            email: email,
            password: password

        };

    }


    try {

        const response =
            await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            });


        const result =
            await response.json();


        if (!response.ok ||
            !result.success) {

            message.style.color =
                "#ff7080";

            message.textContent =
                result.message ||
                "Something went wrong.";

            return;
        }


        /* ACCOUNT CREATED */

        if (!loginMode) {

            message.style.color =
                "#44df98";

            message.textContent =
                "✅ Account created successfully.";

            setTimeout(() => {

                loginMode = true;

                switchAuthMode();

                document.getElementById("authEmail")
                    .value = email;

                document.getElementById("authPassword")
                    .value = "";

            }, 800);

            return;
        }


        /* LOGIN SUCCESS */

        message.style.color =
            "#44df98";

        message.textContent =
            "✅ Login successful.";


        setTimeout(() => {

            closeAuth();

            updateUserMenu();

        }, 500);

    }
    catch (error) {

        message.style.color =
            "#ff7080";

        message.textContent =
            "❌ Server connection failed.";

        console.error(error);
    }
}


/* =========================================================
   USER MENU
========================================================= */

async function updateUserMenu() {

    try {

        const response =
            await fetch("/api/me");

        const data =
            await response.json();


        const loginButton =
            document.querySelector(".login-top-btn");

        const userMenu =
            document.getElementById("userMenu");


        if (data.logged_in) {

            if (loginButton) {
                loginButton.style.display =
                    "none";
            }

            userMenu.style.display =
                "flex";

            document.getElementById(
                "loggedUserName"
            ).textContent =
                data.user.name;

        } else {

            if (loginButton) {
                loginButton.style.display =
                    "block";
            }

            userMenu.style.display =
                "none";
        }

    }
    catch (error) {

        console.log(
            "Unable to check login."
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    try {

        const response =
            await fetch("/api/logout", {
                method: "POST"
            });


        const data =
            await response.json();


        if (data.success) {

            location.reload();

        }

    }
    catch (error) {

        console.error(error);
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function openDashboard() {

    try {

        const response =
            await fetch("/api/history");


        if (response.status === 401) {

            closeDashboard();

            openAuth();

            return;
        }


        const data =
            await response.json();


        if (!data.success) {

            openAuth();

            return;
        }


        const history =
            data.history || [];


        document.getElementById(
            "dashboardModal"
        ).classList.add("active");


        renderDashboard(history);

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to load dashboard."
        );
    }
}


/* ================= RENDER DASHBOARD ================= */

function renderDashboard(history) {

    let highRisk = 0;

    let suspicious = 0;


    history.forEach(item => {

        if (item.risk_level === "HIGH RISK") {

            highRisk++;

        } else if (
            item.risk_level === "SUSPICIOUS"
        ) {

            suspicious++;
        }

    });


    document.getElementById(
        "dashTotalScans"
    ).textContent =
        history.length;


    document.getElementById(
        "dashHighRisk"
    ).textContent =
        highRisk;


    document.getElementById(
        "dashSuspicious"
    ).textContent =
        suspicious;


    const container =
        document.getElementById(
            "historyContainer"
        );


    if (history.length === 0) {

        container.innerHTML = `
            <div class="empty-history">
                🔍 No scans yet.<br>
                Use Scam Scanner to start.
            </div>
        `;

        return;
    }


    let html = `
        <div class="history-list">
    `;


    history.slice(0, 10).forEach(item => {

        const riskClass =
            item.risk_level === "HIGH RISK"
                ? "high"
                : item.risk_level === "SUSPICIOUS"
                    ? "medium"
                    : "low";


        html += `

            <div class="history-item">

                <div class="history-icon">
                    ${
                        item.scan_type === "url"
                            ? "🔗"
                            : item.scan_type === "email"
                                ? "📧"
                                : item.scan_type === "phone"
                                    ? "📱"
                                    : item.scan_type === "payment"
                                        ? "💳"
                                        : "💬"
                    }
                </div>

                <div class="history-main">

                    <strong>
                        ${escapeHTML(item.threat_type)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            item.content.substring(0, 65)
                        )}
                    </p>

                    <small>
                        ${escapeHTML(item.created_at)}
                    </small>

                </div>

                <div class="history-risk ${riskClass}">

                    <strong>
                        ${item.score}
                    </strong>

                    <span>
                        ${escapeHTML(item.risk_level)}
                    </span>

                </div>

            </div>

        `;
    });


    html += `</div>`;


    container.innerHTML = html;
}


/* =========================================================
   CLOSE DASHBOARD
========================================================= */

function closeDashboard() {

    document.getElementById(
        "dashboardModal"
    ).classList.remove("active");

}


/* =========================================================
   DOWNLOAD CSV
========================================================= */

function downloadHistory() {

    window.location.href =
        "/api/history.csv";

}


/* =========================================================
   SECURITY - HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIAL CHECK
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateUserMenu();

    }
);


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

window.addEventListener(
    "click",
    function(event) {

        const auth =
            document.getElementById("authModal");

        const dashboard =
            document.getElementById(
                "dashboardModal"
            );


        if (event.target === auth) {

            closeAuth();

        }


        if (event.target === dashboard) {

            closeDashboard();

        }

    }
);/* =====================================================
   ACCESSIBILITY & VOICE SUPPORT
===================================================== */

let accessLanguage = "en-IN";

let speechRecognition = null;


/* ================= OPEN ================= */

function openAccessibility() {

    document
        .getElementById("accessibilityPanel")
        .classList.add("active");

}


/* ================= CLOSE ================= */

function closeAccessibility() {

    document
        .getElementById("accessibilityPanel")
        .classList.remove("active");

}


/* ================= LANGUAGE ================= */

function changeAccessLanguage(language) {

    accessLanguage = language;

    localStorage.setItem(
        "scamchainAccessLanguage",
        language
    );


    const status =
        document.getElementById(
            "accessStatus"
        );


    const messages = {

        "en-IN":
            "Language set to English.",

        "ta-IN":
            "தமிழ் மொழி தேர்வு செய்யப்பட்டது.",

        "hi-IN":
            "हिन्दी भाषा चुनी गई है।",

        "te-IN":
            "తెలుగు భాష ఎంచుకోబడింది.",

        "ml-IN":
            "മലയാളം തിരഞ്ഞെടുത്തു.",

        "kn-IN":
            "ಕನ್ನಡ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.",

        "bn-IN":
            "বাংলা ভাষা নির্বাচন করা হয়েছে।",

        "mr-IN":
            "मराठी भाषा निवडली आहे.",

        "gu-IN":
            "ગુજરાતી ભાષા પસંદ કરવામાં આવી છે.",

        "pa-IN":
            "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਚੁਣੀ ਗਈ ਹੈ.",

        "or-IN":
            "ଓଡ଼ିଆ ଭାଷା ଚୟନ କରାଯାଇଛି।",

        "ur-IN":
            "اردو زبان منتخب کی گئی ہے۔"

    };


    status.textContent =
        messages[language] ||
        "Language selected.";
}


/* ================= VOICE INPUT ================= */

function startVoiceInput() {

    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    const status =
        document.getElementById(
            "accessStatus"
        );


    if (!Recognition) {

        status.textContent =
            "Voice input is not supported in this browser.";

        return;
    }


    speechRecognition =
        new Recognition();


    speechRecognition.lang =
        accessLanguage;


    speechRecognition.continuous =
        false;


    speechRecognition.interimResults =
        false;


    status.textContent =
        "🎤 Listening... Speak now.";


    speechRecognition.start();


    speechRecognition.onresult =
        function(event) {

            const transcript =
                event.results[0][0]
                    .transcript;


            status.textContent =
                "✅ Voice captured.";


            /*
             * Send voice text to ScamChain AI.
             */

            const aiInput =
                document.getElementById(
                    "aiQuestion"
                );


            if (aiInput) {

                aiInput.value =
                    transcript;

                /*
                 * Open AI panel so user can
                 * see the recognized question.
                 */

                if (
                    typeof openAIAssistant ===
                    "function"
                ) {

                    openAIAssistant();
                }


                aiInput.focus();
            }

        };


    speechRecognition.onerror =
        function() {

            status.textContent =
                "⚠️ Could not understand the voice. Please try again.";
        };


    speechRecognition.onend =
        function() {

            if (
                status.textContent.includes(
                    "Listening"
                )
            ) {

                status.textContent =
                    "Ready to help you.";
            }

        };
}


/* ================= READ PAGE ================= */

function readScamChainPage() {

    const status =
        document.getElementById(
            "accessStatus"
        );


    if (
        !("speechSynthesis" in window)
    ) {

        status.textContent =
            "Text-to-speech is not supported.";

        return;
    }


    speechSynthesis.cancel();


    const importantText = `
        ScamChain AI.

        Detect scams and protect yourself.

        Use the Scam Scanner to check suspicious
        messages, websites, emails, phone numbers
        and payment requests.

        If something looks suspicious,
        do not share OTP, PIN, CVV or password.

        You can also report a suspected scam.

        Use Ask ScamChain AI if you have any doubt.
    `;


    const speech =
        new SpeechSynthesisUtterance(
            importantText
        );


    speech.lang =
        accessLanguage;


    speech.rate =
        0.85;


    speech.pitch =
        1;


    speech.onstart =
        function() {

            status.textContent =
                "🔊 Reading...";
        };


    speech.onend =
        function() {

            status.textContent =
                "✅ Finished.";

        };


    speech.onerror =
        function() {

            status.textContent =
                "⚠️ Voice playback failed.";

        };


    speechSynthesis.speak(
        speech
    );
}


/* ================= STOP VOICE ================= */

function stopVoice() {

    if (
        "speechSynthesis" in window
    ) {

        speechSynthesis.cancel();
    }


    if (speechRecognition) {

        try {

            speechRecognition.stop();

        } catch (error) {

            console.log(error);

        }
    }


    document.getElementById(
        "accessStatus"
    ).textContent =
        "Voice stopped.";
}


/* ================= EASY MODE ================= */

function toggleEasyMode() {

    const checkbox =
        document.getElementById(
            "easyModeToggle"
        );


    if (checkbox.checked) {

        document.body
            .classList
            .add(
                "easy-access-mode"
            );

        localStorage.setItem(
            "scamchainEasyMode",
            "on"
        );

    } else {

        document.body
            .classList
            .remove(
                "easy-access-mode"
            );

        localStorage.setItem(
            "scamchainEasyMode",
            "off"
        );
    }
}


/* ================= HELP ================= */

function speakAccessHelp() {

    const helpText = {

        "en-IN":
            "Choose your language. Press Start Speaking to ask your question by voice. Press Read Page Aloud to hear safety information. Turn on Easy Mode for larger controls.",

        "ta-IN":
            "உங்கள் மொழியை தேர்வு செய்யுங்கள். Start Speaking அழுத்தி குரல் மூலம் கேள்வி கேட்கலாம். Read Page Aloud அழுத்தி பாதுகாப்பு தகவல்களை கேட்கலாம். Easy Mode தேர்வு செய்தால் பெரிய buttons கிடைக்கும்.",

        "hi-IN":
            "अपनी भाषा चुनें। Start Speaking दबाकर आवाज़ से सवाल पूछें। Read Page Aloud दबाकर सुरक्षा जानकारी सुनें। Easy Mode से बड़े बटन मिलेंगे.",

        "te-IN":
            "మీ భాషను ఎంచుకోండి. Start Speaking ద్వారా వాయిస్‌తో ప్రశ్న అడగండి. Read Page Aloud ద్వారా భద్రతా సమాచారాన్ని వినండి.",

        "ml-IN":
            "നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക. Start Speaking അമർത്തി ശബ്ദത്തിലൂടെ ചോദിക്കുക. Read Page Aloud അമർത്തി സുരക്ഷാ വിവരങ്ങൾ കേൾക്കാം.",

        "kn-IN":
            "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ. Start Speaking ಒತ್ತಿ ಧ್ವನಿಯ ಮೂಲಕ ಪ್ರಶ್ನೆ ಕೇಳಿ. Read Page Aloud ಒತ್ತಿ ಸುರಕ್ಷತಾ ಮಾಹಿತಿಯನ್ನು ಕೇಳಿ."
    };


    const text =
        helpText[accessLanguage] ||
        helpText["en-IN"];


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        accessLanguage;

    speech.rate =
        0.85;


    speechSynthesis.cancel();

    speechSynthesis.speak(
        speech
    );
}


/* ================= LOAD SAVED SETTINGS ================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const savedLanguage =
            localStorage.getItem(
                "scamchainAccessLanguage"
            );


        const savedEasyMode =
            localStorage.getItem(
                "scamchainEasyMode"
            );


        if (savedLanguage) {

            accessLanguage =
                savedLanguage;

            const selector =
                document.getElementById(
                    "accessLanguage"
                );

            if (selector) {

                selector.value =
                    savedLanguage;
            }
        }


        if (
            savedEasyMode ===
            "on"
        ) {

            document.body
                .classList
                .add(
                    "easy-access-mode"
                );


            const checkbox =
                document.getElementById(
                    "easyModeToggle"
                );


            if (checkbox) {

                checkbox.checked =
                    true;
            }
        }

    }
);
