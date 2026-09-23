// =====================================================
// SCAMCHAIN AI - TYPE + VOICE ASSISTANT
// =====================================================

let recognition = null;
let lastAIAnswer = "";

let currentInputMode = "type";

const speechLanguages = {
    en: "en-IN",
    ta: "ta-IN",
    hi: "hi-IN",
    te: "te-IN",
    ml: "ml-IN",
    kn: "kn-IN"
};


// =====================================================
// GET TOP WEBSITE LANGUAGE
// =====================================================

function getCurrentLanguage() {

    const selector =
        document.getElementById("websiteLanguage");

    if (selector && selector.value) {
        return selector.value;
    }

    return localStorage.getItem("websiteLanguage") || "en";
}


// =====================================================
// OPEN AI ASSISTANT
// =====================================================

function openAccessibility() {

    const panel =
        document.getElementById("accessibilityPanel");

    if (panel) {
        panel.classList.add("show");
    }

    updateAILanguage();
}


// =====================================================
// CLOSE AI ASSISTANT
// =====================================================

function closeAccessibility() {

    const panel =
        document.getElementById("accessibilityPanel");

    if (panel) {
        panel.classList.remove("show");
    }

    stopVoiceQuestion();
}


// =====================================================
// CHANGE TYPE / SPEAK MODE
// =====================================================

function selectInputMode(mode) {

    currentInputMode = mode;

    const typeButton =
        document.getElementById("typeModeButton");

    const speakButton =
        document.getElementById("speakModeButton");

    const question =
        document.getElementById("aiQuestion");

    if (mode === "type") {

        if (typeButton) {
            typeButton.classList.add("active");
        }

        if (speakButton) {
            speakButton.classList.remove("active");
        }

        if (question) {
            question.placeholder =
                "Type your doubt here...";
            question.focus();
        }

    } else {

        if (speakButton) {
            speakButton.classList.add("active");
        }

        if (typeButton) {
            typeButton.classList.remove("active");
        }

        if (question) {
            question.placeholder =
                "🎤 Speak your doubt...";
        }
    }
}


// =====================================================
// UPDATE LANGUAGE DISPLAY
// =====================================================

function updateAILanguage() {

    const language =
        getCurrentLanguage();

    const languageNames = {

        en: "English",
        ta: "தமிழ்",
        hi: "हिन्दी",
        te: "తెలుగు",
        ml: "മലയാളം",
        kn: "ಕನ್ನಡ"
    };

    const languageText =
        document.getElementById("aiCurrentLanguage");

    if (languageText) {

        languageText.innerText =
            languageNames[language] || "English";
    }
}


// =====================================================
// LISTEN FOR TOP LANGUAGE CHANGE
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const selector =
        document.getElementById("websiteLanguage");

    if (selector) {

        updateAILanguage();

        selector.addEventListener(
            "change",
            function () {

                localStorage.setItem(
                    "websiteLanguage",
                    this.value
                );

                updateAILanguage();
            }
        );
    }
});


// =====================================================
// START SPEAKING
// =====================================================

function startVoiceQuestion() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert(
            "Voice recognition is not supported. Please use Google Chrome."
        );

        return;
    }


    const language =
        getCurrentLanguage();

    const speechLanguage =
        speechLanguages[language] || "en-IN";


    recognition =
        new SpeechRecognition();

    recognition.lang =
        speechLanguage;

    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;


    const question =
        document.getElementById("aiQuestion");

    const micButton =
        document.getElementById("voiceMicButton");

    const answer =
        document.getElementById("aiAnswer");


    if (question) {

        question.placeholder =
            "🎤 Listening...";

    }


    if (micButton) {

        micButton.innerText =
            "🎙️ Listening...";

        micButton.disabled =
            true;
    }


    if (answer) {

        answer.innerText =
            "🎤 Listening... Please speak.";
    }


    recognition.onresult =
        function (event) {

            const spokenText =
                event.results[0][0].transcript;


            // IMPORTANT:
            // Spoken words appear inside textbox

            if (question) {

                question.value =
                    spokenText;
            }


            if (answer) {

                answer.innerText =
                    "✅ Your question was received.";
            }
        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech error:",
                event.error
            );


            if (answer) {

                if (event.error === "not-allowed") {

                    answer.innerText =
                        "🎤 Please allow microphone permission.";

                } else {

                    answer.innerText =
                        "🎤 Could not hear you. Please try again.";
                }
            }
        };


    recognition.onend =
        function () {

            if (micButton) {

                micButton.innerText =
                    "🎤 Start Speaking";

                micButton.disabled =
                    false;
            }


            if (question && !question.value) {

                question.placeholder =
                    "Type your doubt here...";
            }
        };


    try {

        recognition.start();

    } catch (error) {

        console.error(error);

    }
}


// =====================================================
// STOP SPEAKING
// =====================================================

function stopVoiceQuestion() {

    if (recognition) {

        try {
            recognition.stop();
        } catch (error) {
            console.log(error);
        }

        recognition = null;
    }


    const micButton =
        document.getElementById("voiceMicButton");

    if (micButton) {

        micButton.innerText =
            "🎤 Start Speaking";

        micButton.disabled =
            false;
    }
}


// =====================================================
// ASK AI
// =====================================================

async function askScamChainAI() {

    const questionElement =
        document.getElementById("aiQuestion");

    const answerElement =
        document.getElementById("aiAnswer");


    if (!questionElement ||
        !answerElement) {

        return;
    }


    const question =
        questionElement.value.trim();


    if (!question) {

        answerElement.innerText =
            "Please type or speak your doubt first.";

        return;
    }


    const language =
        getCurrentLanguage();


    answerElement.innerText =
        "🤖 AI is thinking...";


    try {

        const response =
            await fetch("/api/assistant", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    question:
                        question,

                    language:
                        language
                })
            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "AI request failed"
            );
        }


        lastAIAnswer =
            data.answer ||
            "No answer received.";


        answerElement.innerText =
            lastAIAnswer;


        // Automatically speak the answer

        speakAIAnswer(
            lastAIAnswer,
            language
        );


    } catch (error) {

        console.error(
            "AI Error:",
            error
        );


        answerElement.innerText =
            "❌ AI is not connected yet. Please check the AI service.";
    }
}


// =====================================================
// AI ANSWER VOICE
// =====================================================

function speakAIAnswer(text, language) {

    if (!("speechSynthesis" in window)) {

        return;
    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(text);


    speech.lang =
        speechLanguages[language] || "en-IN";

    speech.rate =
        0.95;

    speech.pitch =
        1;

    speech.volume =
        1;


    window.speechSynthesis.speak(
        speech
    );
}


// =====================================================
// SPEAK LAST ANSWER BUTTON
// =====================================================

function speakLastAnswer() {

    const language =
        getCurrentLanguage();


    if (!lastAIAnswer) {

        const answer =
            document.getElementById("aiAnswer");

        if (answer) {

            lastAIAnswer =
                answer.innerText;
        }
    }


    if (!lastAIAnswer) {

        return;
    }


    speakAIAnswer(
        lastAIAnswer,
        language
    );
}