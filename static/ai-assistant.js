// =====================================================
// SCAMCHAIN AI - CHAT + VOICE CHAT MODE
// =====================================================

let aiRecognition = null;
let lastAIAnswer = "";
let voiceChatMode = false;
let isAIThinking = false;


// =====================================================
// LANGUAGE
// =====================================================

function getAILanguage() {

    const selector =
        document.getElementById("websiteLanguage");

    return selector?.value || "en";
}


const speechLanguages = {

    en: "en-IN",
    ta: "ta-IN",
    hi: "hi-IN",
    te: "te-IN",
    ml: "ml-IN",
    kn: "kn-IN"
};


const languageNames = {

    en: "English",
    ta: "தமிழ்",
    hi: "हिन्दी",
    te: "తెలుగు",
    ml: "മലയാളം",
    kn: "ಕನ್ನಡ"
};


// =====================================================
// OPEN / CLOSE AI
// =====================================================

function toggleAI() {

    const box =
        document.getElementById("aiBox");

    if (!box) return;

    if (box.style.display === "none" ||
        box.style.display === "") {

        box.style.display = "block";

        updateAILanguage();

    } else {

        box.style.display = "none";

        stopVoiceChat();
    }
}


// =====================================================
// UPDATE LANGUAGE
// =====================================================

function updateAILanguage() {

    const language = getAILanguage();

    const el =
        document.getElementById("aiLanguage");

    if (el) {

        el.innerText =
            languageNames[language] || "English";
    }
}


// =====================================================
// VOICE CHAT START
// =====================================================

function startVoiceChat() {

    if (isAIThinking) return;


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice chat requires Google Chrome."
        );

        return;
    }


    voiceChatMode = true;

    startListening();
}


// =====================================================
// START LISTENING
// =====================================================

function startListening() {

    if (!voiceChatMode) return;

    if (isAIThinking) return;


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) return;


    const input =
        document.getElementById("aiInput");

    const mic =
        document.getElementById("aiMic");


    aiRecognition =
        new SpeechRecognition();


    const language =
        getAILanguage();


    aiRecognition.lang =
        speechLanguages[language] || "en-IN";


    aiRecognition.continuous = false;

    aiRecognition.interimResults = false;

    aiRecognition.maxAlternatives = 1;


    if (input) {

        input.placeholder =
            "🎤 Listening...";

    }


    if (mic) {

        mic.innerText =
            "🎙️";

    }


    aiRecognition.onresult =
        function(event) {

            const spokenText =
                event.results[0][0]
                    .transcript;


            if (input) {

                input.value =
                    spokenText;

            }


            // Automatically send voice question

            sendAI(true);

        };


    aiRecognition.onerror =
        function(event) {

            console.log(
                "Voice error:",
                event.error
            );


            if (input) {

                input.placeholder =
                    "Type your doubt...";

            }


            if (mic) {

                mic.innerText =
                    "🎤";

            }


            if (
                event.error !==
                "aborted"
            ) {

                setTimeout(() => {

                    if (voiceChatMode) {

                        startListening();

                    }

                }, 1000);

            }

        };


    aiRecognition.onend =
        function() {

            if (input) {

                input.placeholder =
                    "Type your doubt...";

            }


            if (mic) {

                mic.innerText =
                    "🎤";

            }

        };


    try {

        aiRecognition.start();

    } catch (error) {

        console.log(error);

    }
}


// =====================================================
// STOP VOICE CHAT
// =====================================================

function stopVoiceChat() {

    voiceChatMode = false;


    if (aiRecognition) {

        try {

            aiRecognition.stop();

        } catch (error) {

            console.log(error);

        }

        aiRecognition = null;
    }


    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    const mic =
        document.getElementById("aiMic");


    if (mic) {

        mic.innerText =
            "🎤";

    }
}


// =====================================================
// NORMAL SPEAK BUTTON
// =====================================================

function startAISpeech() {

    voiceChatMode = false;

    startListening();
}


// =====================================================
// SEND AI MESSAGE
// =====================================================

async function sendAI(fromVoice = false) {

    const input =
        document.getElementById("aiInput");

    const chat =
        document.getElementById("aiChat");


    if (!input || !chat) return;


    const question =
        input.value.trim();


    if (!question) {

        alert(
            "Please type or speak your doubt."
        );

        return;
    }


    if (aiRecognition) {

        try {
            aiRecognition.stop();
        } catch (error) {}

    }


    // -------------------------------------------------
    // USER MESSAGE
    // -------------------------------------------------

    const user =
        document.createElement("div");


    user.style.cssText = `
        background:#2563eb;
        color:white;
        padding:10px 12px;
        border-radius:14px;
        margin:10px 0 10px auto;
        max-width:82%;
        line-height:1.5;
    `;


    user.innerText =
        question;


    chat.appendChild(user);


    input.value = "";


    // -------------------------------------------------
    // THINKING
    // -------------------------------------------------

    const bot =
        document.createElement("div");


    bot.style.cssText = `
        background:#1e293b;
        color:white;
        padding:10px 12px;
        border-radius:14px;
        margin:10px 0;
        max-width:88%;
        line-height:1.5;
    `;


    bot.innerText =
        "🤖 Thinking...";


    chat.appendChild(bot);


    chat.scrollTop =
        chat.scrollHeight;


    isAIThinking = true;


    try {

        const response =
            await fetch(
                "/api/assistant",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        question:
                            question,

                        language:
                            getAILanguage()

                    })
                }
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success &&
            data.answer
        ) {

            lastAIAnswer =
                data.answer;


            bot.innerText =
                "🤖 " +
                data.answer;


            chat.scrollTop =
                chat.scrollHeight;


            // Voice mode:
            // automatically speak answer

            if (fromVoice) {

                speakAIAnswer(
                    data.answer
                );

            }

        } else {

            bot.innerText =
                "❌ " +
                (
                    data.error ||
                    "AI answer கிடைக்கவில்லை."
                );

        }


    } catch (error) {

        console.error(
            "AI error:",
            error
        );


        bot.innerText =
            "❌ AI backend connection failed.";

    }


    isAIThinking = false;


    // -------------------------------------------------
    // CONTINUE VOICE CHAT
    // -------------------------------------------------

    if (fromVoice &&
        voiceChatMode) {

        setTimeout(
            function() {

                if (
                    voiceChatMode &&
                    !isAIThinking
                ) {

                    startListening();

                }

            },
            800
        );

    }


    chat.scrollTop =
        chat.scrollHeight;
}


// =====================================================
// SPEAK ANSWER
// =====================================================

function speakAIAnswer(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    window.speechSynthesis.cancel();


    const language =
        getAILanguage();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        speechLanguages[
            language
        ] || "en-IN";


    speech.rate =
        0.95;


    speech.pitch =
        1;


    speech.volume =
        1;


    speech.onend =
        function() {

            // After AI speaks,
            // automatically listen again

            if (voiceChatMode) {

                setTimeout(
                    function() {

                        startListening();

                    },
                    300
                );

            }

        };


    window.speechSynthesis.speak(
        speech
    );
}


// =====================================================
// SPEAK LAST ANSWER BUTTON
// =====================================================

function speakAnswer() {

    if (!lastAIAnswer) {

        alert(
            "First ask AI a question."
        );

        return;
    }


    speakAIAnswer(
        lastAIAnswer
    );
}


// =====================================================
// LANGUAGE CHANGE
// ================a=====================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateAILanguage();


        const selector =
            document.getElementById(
                "websiteLanguage"
            );


        if (selector) {

            selector.addEventListener(
                "change",
                function() {

                    updateAILanguage();

                }
            );

        }

    }
);