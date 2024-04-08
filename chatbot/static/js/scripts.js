// const settings = window.MySettings;

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

let action_ids = []
let actions = []
let actions_from_id = {}
let chosen_actions = {}
let chosen_action_template = ""

let session_id = -1
let sender_agent_id = -1
let receiver_agent_id = -1

var id = document.getElementById("drawflow");
const editor = new Drawflow(id);
editor.reroute = true;
editor.editor_mode = 'edit';
editor.start();

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


    // document.getElementById('sendMessageInput').focus();

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
            // // Check if there are options in the response
            // if (data.message && data.message.length > 0) {
            //     // Display options as buttons
            //     displayOptions(data.message, 'USER_CHOSE_MENU_OPTION');
            // }
        } else if (data.ds_action === 'REQUEST_USER_CHOOSE_UTTERANCE') {
            // // Check if there are options in the response
            // if (data.message && data.message.length > 0) {
            //     // Display options as buttons
            //     displayOptions(data.message, 'USER_CHOSE_UTTERANCE');
            // }
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
        } else if (data.ds_action === 'SESSIONS_INFO') {
            updateSessionsInfo(data.message);
        } else if (data.ds_action === 'ACTIONS_INFO') {
            updateActionsInfo(data.message);
        } else if (data.ds_action === 'SEND_UTTERANCE_BY_ACTION') {
            document.getElementById('sendActionUtteranceInput').value = data.message;
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

})
;

function updateActionsInfo(message) {
    let actionsBox = document.getElementById('actionsBox');
    // let actionToBuilt = document.getElementById('actionToBuilt');
    let actionslist = document.getElementById('actions-list');
    actionsBox.innerHTML = ``;
    let actionsBoxInnerHtml = ``;
    message.forEach(action => {
        // actionsBoxInnerHtml += `${action["Name"]}`;
        actions.push(action);
        let action_id = "action-" + action["name"];
        action_ids.push(action_id);
        actionslist.innerHTML += `<li><a class="dropdown-item" href="#" onclick="chooseAction('${action_id}')">${action["name"]}</a></li>`
        actionsBoxInnerHtml += `<div id="${action_id}">`
        actions_from_id[action_id] = action;
        // for (const [paramName, paramEntries] of Object.entries(action['parameters'])) {
        //     actionsBoxInnerHtml += `
        //             <div class="btn-group dropup">
        //                         <button type="button" class="btn btn-outline-dark dropdown-toggle"
        //                                 data-bs-toggle="dropdown"
        //                                 aria-expanded="false">
        //                             ${paramName}
        //                         </button>
        //                         <ul class="dropdown-menu">`;
        //     for (let paramEntry of paramEntries) {
        //         let paramValue = paramEntry['value']
        //         let paramType = paramEntry['type']
        //
        //         let escaped_attr = paramValue
        //         if (paramValue != null) {
        //             escaped_attr = paramValue.replace("'", "\\'")
        //         }
        //         actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${paramName}', '${paramType}', '${escaped_attr}')">${paramValue}</a></li>`
        //     }
        //     actionsBoxInnerHtml += `</ul></div>`
        // }
        actionsBoxInnerHtml += `</div>`
    });
    actionsBox.innerHTML = actionsBoxInnerHtml;
    // hideAllActions();
}

// function hideAllActions() {
//     for (let action_id in action_ids) {
//         document.getElementById(action_ids[action_id]).style.display = 'none';
//     }
// }

function setAttrForChosenAction(chosenActionId, paramName, paramType, paramValue) {
    const ids = chosenActionId.split("-")

    let tmp = chosen_actions;
    for(const id of ids){
        if (!(id in tmp)){
            tmp[id] = {'parameters':{}}
        }
        tmp = tmp[id]['parameters']
    }
    tmp[paramName] = {'type': paramType, 'value': paramValue};
    // chosen_actions[chosenActionId]['parameters'][paramName] = {'type': paramType, 'value': paramValue};
    updateChosenActionTemplate(chosenActionId, paramName, paramType, paramValue);

}

function getUniqueId(){
    return Math.random().toString(16).slice(2);
}

function chooseAction(actionId) {
    let chosenActionElement = document.getElementById(actionId);
    // hideAllActions();
    chosenActionElement.style.display = 'inline';
    const chosenActionId = getUniqueId();
    chosen_actions[chosenActionId] = {
        'actionId': actionId,
        'name': actionId.split("-")[1],
        'parameters': {},
        'template': actions_from_id[actionId]['template'],
        'action': actions_from_id[actionId]
    };
    // chosen_actions[actionId]["name"] = actionId.split("-")[1]; // get the action name
    // chosen_actions[actionId]['parameters'] = {};
    // chosen_action_template = actions_from_id[actionId]["template"]
    showChosenActionTemplate(chosenActionId);
    updateSuggestedActionUtterance();
}

function showChosenActionTemplate(id) {
    let template = chosen_actions[id]['template']
    const action = chosen_actions[id]['action']
    for (const [paramName, paramEntries] of Object.entries(action['parameters'])) {
        let actionsBoxInnerHtml = ``;
        actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${id}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;
        if (paramEntries["type"] === 'Relation' || paramEntries["type"] === 'Action' || paramEntries["type"] === 'Effect') {
            //     This means we don't need a dropdown because we will use dropdowns inside it. E.g., for relations, actions and effects
            actionsBoxInnerHtml = `
                ${paramName}(`;
        } else {
            actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${id}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;
        }

        for (let paramEntry of paramEntries) {
            let paramValue = paramEntry['value']
            let paramType = paramEntry['type']

            if (paramType === 'Relation' || paramType === 'Action' || paramType === 'Effect') {
                // if ("parameters" in paramValue) {
                //     let paramTemplate = paramEntry["template"]
                //     for (const [pparamName, pparamEntries] of Object.entries(paramValue["parameters"])) {
                //         let pparamInnerHtml = `
                //                         <div class="btn-group dropup">
                //             <button id="${chosenActionId}-${pparamName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                //                     data-bs-toggle="dropdown"
                //                     aria-expanded="false">
                //                 ${pparamName}
                //             </button>
                //             <ul class="dropdown-menu">\`;
                //                 `;
                //         for (let pparamEntry of pparamEntries) {
                //             if (pparamEntry != null) {
                //                 let pparamValue = pparamEntry['value']
                //
                //                 let pparamType = pparamEntry['type']
                //                 let param_escaped_attr = pparamValue
                //                 if (pparamValue != null) {
                //                     param_escaped_attr = pparamValue.replace("'", "\\'")
                //                 }
                //                 pparamInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${chosenActionId}', '${pparamName}', '${pparamType}', '${param_escaped_attr}')">${paramValue}</a></li>`
                //             }
                //         }
                //         pparamInnerHtml += `</ul></div>`
                //         paramTemplate = paramTemplate.replace("[" + paramName + "]", actionsBoxInnerHtml);
                //     }
                //     paramValue = paramTemplate;
                // }
                // let escaped_attr = paramValue
                if (paramValue != null) {
                    // escaped_attr = paramValue.replace("'", "\\'")
                    actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}', '${encodeURIComponent(JSON.stringify(paramEntry).replaceAll("'", "TMPQUOTE"))}')">${paramType}</a></li>`
                }
            } else {

                let escaped_attr = paramValue
                if (paramValue != null) {
                    if (typeof (paramValue) === 'string') {
                        escaped_attr = paramValue.replace("'", "\\'")
                    }
                    actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${id}', '${paramName}', '${paramType}', '${escaped_attr}')">${paramValue}</a></li>`
                }
            }

        }

        actionsBoxInnerHtml += `</ul></div>`
        template = template.replace("[" + paramName + "]", actionsBoxInnerHtml);

    }
    const deleteButton = `<div class="btn-group dropup">
                                    <button type="button" class="btn btn-outline-danger"
                                            aria-expanded="false"
                                            onclick=removeChosenAction('${id}')>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    </div>`
    const createdAction = `<div id='${id}-block' class='box-border'>` + deleteButton + `<p>` + action['name'] + `</p>` + template + `</div>`
    document.getElementById('chosenActionBox').innerHTML += createdAction;
}

function createNewParameterBlock(id, blockParam) {
    blockParam = JSON.parse(decodeURIComponent(blockParam.replaceAll("TMPQUOTE", "'")));
    const blockId = getUniqueId();
    let template = blockParam['template']
    for (const [paramName, paramEntries] of Object.entries(blockParam['value']['parameters'])) {
        let actionsBoxInnerHtml = ``;
        actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${blockId}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;
        if (paramEntries["type"] === 'Relation' || paramEntries["type"] === 'Action' || paramEntries["type"] === 'Effect') {
            //     This means we don't need a dropdown because we will use dropdowns inside it. E.g., for relations, actions and effects
            actionsBoxInnerHtml = `
                ${paramName}(`;
        } else {
            actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${blockId}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;
        }

        for (let paramEntry of paramEntries) {
            if (paramEntry == null)
                continue;
            let paramValue = paramEntry['value']
            let paramType = paramEntry['type']

            if (paramType === 'Relation' || paramType === 'Action' || paramType === 'Effect') {
                // if ("parameters" in paramValue) {
                //     let paramTemplate = paramEntry["template"]
                //     for (const [pparamName, pparamEntries] of Object.entries(paramValue["parameters"])) {
                //         let pparamInnerHtml = `
                //                         <div class="btn-group dropup">
                //             <button id="${chosenActionId}-${pparamName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                //                     data-bs-toggle="dropdown"
                //                     aria-expanded="false">
                //                 ${pparamName}
                //             </button>
                //             <ul class="dropdown-menu">\`;
                //                 `;
                //         for (let pparamEntry of pparamEntries) {
                //             if (pparamEntry != null) {
                //                 let pparamValue = pparamEntry['value']
                //
                //                 let pparamType = pparamEntry['type']
                //                 let param_escaped_attr = pparamValue
                //                 if (pparamValue != null) {
                //                     param_escaped_attr = pparamValue.replace("'", "\\'")
                //                 }
                //                 pparamInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${chosenActionId}', '${pparamName}', '${pparamType}', '${param_escaped_attr}')">${paramValue}</a></li>`
                //             }
                //         }
                //         pparamInnerHtml += `</ul></div>`
                //         paramTemplate = paramTemplate.replace("[" + paramName + "]", actionsBoxInnerHtml);
                //     }
                //     paramValue = paramTemplate;
                // }
                // let escaped_attr = paramValue
                if (paramValue != null) {
                    // escaped_attr = paramValue.replace("'", "\\'")
                    actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="createNewParameterBlock('${blockId}', '${paramEntry}')">${paramType}</a></li>`
                }
            } else {

                let escaped_attr = paramValue
                if (paramValue != null) {
                    if (typeof (paramValue) === 'string') {
                        escaped_attr = paramValue.replace("'", "\\'")
                    }
                    actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${id}-${blockId}', '${paramName}', '${paramType}', '${escaped_attr}')">${paramValue}</a></li>`
                }
            }

        }

        actionsBoxInnerHtml += `</ul></div>`
        template = template.replace("[" + paramName + "]", actionsBoxInnerHtml);
mti
    }
    const deleteButton = `<div class="btn-group dropup">
                                    <button type="button" class="btn btn-outline-danger"
                                            aria-expanded="false"
                                            onclick=removeChosenAction('${blockId}')>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    </div>`
    const createdAction = `<div id='${blockId}-block' class='box-border'>` + deleteButton + `<p>` + blockParam['type'] + `</p>` + template + `</div>`
    document.getElementById(id + '-block').innerHTML += createdAction;
}

function removeChosenAction(chosenActionId) {
    delete chosen_actions[chosenActionId];
    document.getElementById(chosenActionId + '-block').remove();
    updateSuggestedActionUtterance();
}

function updateChosenActionTemplate(chosenActionId, paramName, paramType, paramValue) {
    document.getElementById(chosenActionId.split("-")[-1] + '-' + paramName).innerHTML = paramValue;
    updateSuggestedActionUtterance();
}


function updateSessionsInfo(message) {
    if (editor) {
        editor.clear();
    }
    // editor.clear();
    // editor.reroute = true;
    // editor.editor_mode = 'view';
    // editor.start();
    let pos_x = 0;
    let pos_y = 0;
    let pos_x_space = 500;
    let session_ix = 0;
    message.forEach(session => {
        let start_conditions_str = `<ul>`;
        session.start_conditions.forEach(start_condition => {
            start_conditions_str += `<li>(${start_condition.status}) ${start_condition.condition}</li>`;
        });
        start_conditions_str += `</ul>`;

        let expectations_str = `<ul>`;
        session.expectations.forEach(expectation => {
            expectations_str += `<li>(${expectation.status}) ${expectation.expectation}</li>`
        });
        expectations_str += `</ul>`;

        let end_goals_str = `<ul>`;
        session.end_goals.forEach(end_goal => {
            end_goals_str += `<li>(${end_goal.status}) ${end_goal.end_goal}</li>`
        });
        end_goals_str += `</ul>`;
        let html = `
        <div>
          <div class="title-box">${session.name} (${session.status})</div>
          <div class="box">
            <div class="accordion" id="accordionExample">
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne${session_ix}" aria-expanded="true" aria-controls="collapseOne">
                    Starting Conditions
                  </button>
                </h2>
                <div id="collapseOne${session_ix}" class="accordion-collapse collapse show" aria-labelledby="headingOne">
                  <div class="accordion-body">
                    ${start_conditions_str}
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingTwo">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo${session_ix}" aria-expanded="false" aria-controls="collapseTwo">
                    Expectations
                  </button>
                </h2>
                <div id="collapseTwo${session_ix}" class="accordion-collapse collapse" aria-labelledby="headingTwo">
                  <div class="accordion-body">
                    ${expectations_str}
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingThree">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree${session_ix}" aria-expanded="false" aria-controls="collapseThree">
                    End Goals
                  </button>
                </h2>
                <div id="collapseThree${session_ix}" class="accordion-collapse collapse" aria-labelledby="headingThree">
                  <div class="accordion-body">
                    ${end_goals_str}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        `;
        let data = {};
        editor.addNode(`session${session_ix}`, 1, 1, pos_x + (pos_x_space * session_ix), pos_y, 'github', data, html);
        session_ix += 1;
    })
    // for (let i = session_ix; i > 0; i--) {
    //     editor.addConnection(`session${i}`, `session${i - 1}`, 'output_1', 'input_1');
    // }

}

function processText(text) {
    if (typeof text === 'string' || text instanceof String) {
        // /abc/g is a regex which basically does replaceAll(abc, def)
        text = text.toString().replaceAll('\n', `</br>`)
            .replaceAll('failed', `<span class="text-danger">failed</span>`)
            .replaceAll('completed', `<span class="text-success">completed</span>`);
    }
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

function sendAction() {
    const sendActionUtteranceInput = document.getElementById('sendActionUtteranceInput');
    const messageBox = document.getElementById('messageBox');

    // Get current time
    const currentTime = new Date().toLocaleTimeString();

    // Add message to the message box
    messageBox.innerHTML += `
        <div>${sendActionUtteranceInput.value}</div>
        <div class="timestamp">${currentTime}</div>
        <hr>
    `;

    // Scroll to the bottom of the message box
    messageBox.scrollTop = messageBox.scrollHeight;

    // Disable the send button again after sending
    document.getElementById('sendActionButton').disabled = true;
    let message = {
        'ds_action_by_type': '',
        'ds_action_by': 'Joe(patient)',
        'message': chosen_actions,
        'ds_action': 'USER_CHOSE_ACTIONS',
        'session_id': session_id,
        'sender_agent_id': sender_agent_id,
        'receiver_agent_id': receiver_agent_id
    }
    // Clear the input text box
    sendActionUtteranceInput.value = '';

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
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('sendMessageInput');
    sendButton.disabled = !messageInput.value.trim();
}

function updateSuggestedActionUtterance() {
    const sendActionButton = document.getElementById('sendActionButton');
    const sendActionUtteranceInput = document.getElementById('sendActionUtteranceInput');

    // if the filled in template include a square bracket [, then there exists some values yet to be filled in

    sendActionButton.disabled = document.getElementById('chosenActionBox').innerHTML.toString().includes("[");

    sendActionUtteranceInput.value = '';
    if (!sendActionButton.disabled) {
        let message = {
            'ds_action_by_type': '',
            'ds_action_by': 'Joe(patient)',
            'message': Object.values(chosen_actions),
            'ds_action': 'REQUEST_UTTERANCE_BY_ACTION',
            'session_id': session_id,
            'sender_agent_id': sender_agent_id,
            'receiver_agent_id': receiver_agent_id
        }

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
    } else {
        sendActionUtteranceInput.value = '';
    }
}