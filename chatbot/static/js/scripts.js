// const settings = window.MySettings;
//
const {
    DIALOGUE_SYSTEM_HOST,
    DIALOGUE_SYSTEM_PORT,
    BUDGIE_WEB_SOCKET_HOST,
    BUDGIE_WEB_SOCKET_PORT,
    BUDGIE_WEB_HOST,
    BUDGIE_WEB_PORT
} = settings;

const socket = io(BUDGIE_WEB_SOCKET_HOST + ':' + BUDGIE_WEB_SOCKET_PORT);
const url = DIALOGUE_SYSTEM_HOST + ':' + DIALOGUE_SYSTEM_PORT + '/send-message';

// Define a queue to hold the asynchronous functions
const progressBarQueue = [];
const intervalUpdateFrequency = 1000;

let session_id = -1
let sender_agent_id = -1
let receiver_agent_id = -1

$(document).ready(function () {
    function processQueue() {
        if (progressBarQueue.length > 0) {
            for (const progressbarId of progressBarQueue) {
                const progressBar = $('#' + progressbarId[0]);
                const duration = progressbarId[1]; // duration is in seconds, intervalUpdateFrequency is in ms
                const updateRate = (100 / (duration * 1000)) * intervalUpdateFrequency;
                // console.log(updateRate);
                let widthInPercent = progressBar.width() / progressBar.parent().width() * 100;
                if (widthInPercent < 100) {
                    progressBar.css('width', widthInPercent + updateRate + '%');
                } else {
                    progressBar.css('width', 100 + '%');
                }
            }
            for (let i = progressBarQueue.length - 1; i >= 0; i--) {
                const progressBar = $('#' + progressBarQueue[i][0]);
                let widthInPercent = progressBar.width() / progressBar.parent().width() * 100;
                if (widthInPercent >= 100) {
                    progressBarQueue.splice(i, 1);
                }
            }
        }
    }

    setInterval(function () {
        processQueue();
    }, intervalUpdateFrequency);


    document.getElementById('sendMessageInput').focus();

    fetch(url, {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            'ds_action': 'START_DIALOGUE'
        }),
    })
        .then(response => response.json())
        .then(data => {
            // console.log('Response from server:', data);
        })
        .catch(error => {
            console.error('Error sending message:', error);
        });

    socket.on('stream_message', function (data) {
        // Append received messages to the message box
        const messageBox = document.getElementById('messageBox');
        const actionHistory = document.getElementById('action-history')
        // Get current time
        var currentTime = new Date().toLocaleTimeString();
        let message = processText(data.message);
        console.log(data);

        if (data.ds_action === 'DIALOGUE_STARTED') {
            session_id = data.session_id;
            sender_agent_id = data.sender_agent_id
            receiver_agent_id = data.receiver_agent_id
        } else if (data.ds_action === 'REQUEST_USER_CHOOSE_MENU_OPTION') {
            // Check if there are options in the response
            if (data.message && data.message.length > 0) {
                // Display options as buttons
                displayOptions(data.message, 'USER_CHOSE_MENU_OPTION');
            }
        } else if (data.ds_action === 'REQUEST_USER_CHOOSE_UTTERANCE') {
            // Check if there are options in the response
            if (data.message && data.message.length > 0) {
                // Display options as buttons
                displayOptions(data.message, 'USER_CHOSE_UTTERANCE');
            }
        } else if (data.ds_action === 'LOG_ACTION_START') {
            let barId = "id" + Math.random().toString(16).slice(2)
            actionHistory.innerHTML += `
                        <div class="agent">${data.ds_action_by}</div>
                        <div>${data.message}</div>
                        <div class="timestamp">${currentTime}</div>
                        <div class="progress" style="height: 2px;">
                            <div id="${barId}" class="progress-bar progress-bar-fill" role="progressbar" style="width: 0;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <hr>
            `;

            progressBarQueue.push([barId, data.duration]);

            // fillProgressBar(ldProgress, 2);
            actionHistory.scrollTop = actionHistory.scrollHeight;
        } else if (data.ds_action === 'LOG_ACTION_COMPLETED') {

            actionHistory.innerHTML += `
                        <div class="agent">${data.ds_action_by}</div>
                        <div>${message}</div>
                        <div class="timestamp">${currentTime}</div>
                        <hr>
            `;
            actionHistory.scrollTop = actionHistory.scrollHeight;
        } else if (data.ds_action === 'LOG_ACTION_FAILED') {
            let reason = processText(data.reason);
            actionHistory.innerHTML += `
                        <div class="agent">${data.ds_action_by}</div>
                        <div>${message}</div>
                        <div>${reason}</div>
                        <div class="timestamp">${currentTime}</div>
                        <hr>
            `;
            actionHistory.scrollTop = actionHistory.scrollHeight;
        } else if (data.ds_action === 'DISPLAY_LOG') {
            actionHistory.innerHTML += `
                    <div class="agent">${data.ds_action_by}</div>
                    <div>${message}</div>
                    <div class="timestamp">${currentTime}</div>
                    <hr>
        `;
            actionHistory.scrollTop = actionHistory.scrollHeight;
        } else {
            // Add message to the message box
            messageBox.innerHTML += `
                <div class="agent">${data.ds_action_by}</div>
                <div>${message}</div>
                <div class="timestamp">${currentTime}</div>
                <hr>
            `;
            messageBox.scrollTop = messageBox.scrollHeight;
        }
    });

});

function processText(text) {
    // /abc/g is a regex which basically does replaceAll(abc, def)
    text = text.toString().replaceAll('\n', `</br>`)
        .replaceAll('failed', `<span class="text-danger">failed</span>`)
        .replaceAll('completed', `<span class="text-success">completed</span>`);
    return text
}

function sendMessage() {
    var messageInput = document.getElementById('sendMessageInput');
    var messageBox = document.getElementById('messageBox');

    // Check if the input box is empty
    if (messageInput.value.trim() === '') {
        return;
    }

    // Get current time
    var currentTime = new Date().toLocaleTimeString();

    // Add message to the message box
    messageBox.innerHTML += `
        <div>${messageInput.value}</div>
        <div class="timestamp">${currentTime}</div>
        <hr>
    `;

    // Scroll to the bottom of the message box
    messageBox.scrollTop = messageBox.scrollHeight;

    // Disable the send button again after sending
    document.getElementById('sendButton').disabled = true;
    let message = {
        'ds_action_by_type': '',
        'ds_action_by': '',
        'message': '',
        'ds_action': '',
    }
    // Clear the input text box
    messageInput.value = '';
    console.log(message);

    fetch(url, {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(message),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Response from server:', data);
        })
        .catch(error => {
            console.error('Error sending message:', error);
        });
    messageInput.focus();
}

function checkEnter(event) {
    var sendButton = document.getElementById('sendButton');
    var messageInput = document.getElementById('sendMessageInput');

    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        // Check if the input box is empty
        if (messageInput.value.trim() !== '') {
            sendMessage();
        }
    }
    // Toggle send button based on input
    toggleSendButton();
}

function selectOption(selectedOption, ds_action) {
    // Send the selected option to the server
    let message = {
        'ds_action_by_type': '',
        'ds_action_by': 'Joe(patient)',
        'message': selectedOption,
        'ds_action': ds_action,
        'session_id': session_id,
        'sender_agent_id': sender_agent_id,
        'receiver_agent_id': receiver_agent_id
    };
    $('#select-menu-option').remove();
    fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(message),
    })
        .then(response => response.json())
        .then(data => {
            // console.log('Response from server:', data);
        })
        .catch(error => {
            console.error('Error sending message:', error);
        });
}

function displayOptions(options, ds_action) {
    var messageBox = document.getElementById('messageBox');

    let menu_options = `<div id="select-menu-option" class="d-flex flex-column p-2">`;
    // Create buttons for each option
    options.forEach(option => {
        menu_options += `
            <button style="white-space: normal;" class="btn btn-outline-dark option-button m-1" onclick="selectOption('${option}', '${ds_action}')">${option}</button>
        `;
    });
    menu_options += `</div>`
    messageBox.innerHTML += menu_options

    // Scroll to the bottom of the message box
    messageBox.scrollTop = messageBox.scrollHeight;
}

function toggleSendButton() {
    var sendButton = document.getElementById('sendButton');
    var messageInput = document.getElementById('sendMessageInput');
    sendButton.disabled = !messageInput.value.trim();
}