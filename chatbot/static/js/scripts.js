// const settings = window.MySettings;

const {
  DIALOGUE_SYSTEM_HOST,
  DIALOGUE_SYSTEM_PORT,
  BUDGIE_WEB_SOCKET_HOST,
  BUDGIE_WEB_SOCKET_PORT,
  BUDGIE_WEB_HOST,
  BUDGIE_WEB_PORT,
} = settings;

const socket = io(BUDGIE_WEB_SOCKET_HOST + ":" + BUDGIE_WEB_SOCKET_PORT);
const url = DIALOGUE_SYSTEM_HOST + ":" + DIALOGUE_SYSTEM_PORT + "/send-message";

// Define a queue to hold the asynchronous functions
const progressBarQueue = [];
const intervalUpdateFrequency = 1000;

let action_ids = [];
let actions = [];
let actions_from_id = {};
let chosen_actions = {};

let effect_ids = [];
let effects = [];
let effects_from_id = {};

let param_id_to_name_map = {};
let param_id_to_type_map = {};

let session_id = -1;
let sender_agent_id = -1;
let receiver_agent_id = -1;

let scenarioIdsWithName = {};
let agentIdsWithName = {};

let isDialogueStarted = false;

var id = document.getElementById("drawflow");
const editor = new Drawflow(id);
editor.reroute = true;
editor.editor_mode = "edit";
editor.start();

$(document).ready(function () {
  const sendMessageInput = document.getElementById("sendMessageInput");
  sendMessageInput.focus();

  function processQueue() {
    if (progressBarQueue.length > 0) {
      for (const progressbarId of progressBarQueue) {
        const progressBar = $("#" + progressbarId[0]);
        const duration = progressbarId[1]; // duration is in seconds, intervalUpdateFrequency is in ms
        const updateRate = (100 / (duration * 1000)) * intervalUpdateFrequency;
        // console.log(updateRate);
        let widthInPercent =
          (progressBar.width() / progressBar.parent().width()) * 100;
        if (widthInPercent < 100) {
          progressBar.css("width", widthInPercent + updateRate + "%");
        } else {
          progressBar.css("width", 100 + "%");
        }
      }
      for (let i = progressBarQueue.length - 1; i >= 0; i--) {
        const progressBar = $("#" + progressBarQueue[i][0]);
        let widthInPercent =
          (progressBar.width() / progressBar.parent().width()) * 100;
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

  sendMessageToApi("BUDGIE-WEB", "INIT", "");

  socket.on("stream_message", function (data) {
    // Append received messages to the message box
    const messageBox = document.getElementById("messageBox");
    const actionHistory = document.getElementById("action-history");
    // Get current time
    var currentTime = new Date().toLocaleTimeString();
    let message = processText(data.message);
    console.log(data);

    if (data.ds_action === "REQUEST_USER_CHOOSE_SCENARIO") {
      session_id = data.session_id;
      scenarioIdsWithName = data.message;
      showSelectScenarioPanel();
    } else if (data.ds_action === "REQUEST_USER_CHOOSE_AGENT") {
      agentIdsWithName = data.message;
      showSelectAgentPanel();
    } else if (data.ds_action === "DIALOGUE_STARTED") {
      isDialogueStarted = true;
      actionHistory.innerHTML += `
      <div class="agent">${data.ds_action_by}</div>
      <div>${message}</div>
      <div class="timestamp">${currentTime}</div>
      <hr>
`;
    } else if (data.ds_action === "REQUEST_USER_CHOOSE_MENU_OPTION") {
      // // Check if there are options in the response
      // if (data.message && data.message.length > 0) {
      //     // Display options as buttons
      //     displayOptions(data.message, 'USER_CHOSE_MENU_OPTION');
      // }
    } else if (data.ds_action === "REQUEST_USER_CHOOSE_UTTERANCE") {
      // // Check if there are options in the response
      // if (data.message && data.message.length > 0) {
      //     // Display options as buttons
      //     displayOptions(data.message, 'USER_CHOSE_UTTERANCE');
      // }
    } else if (data.ds_action === "LOG_ACTION_START") {
      let barId = "id" + Math.random().toString(16).slice(2);
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
    } else if (data.ds_action === "LOG_ACTION_COMPLETED") {
      actionHistory.innerHTML += `
                        <div class="agent">${data.ds_action_by}</div>
                        <div>${message}</div>
                        <div class="timestamp">${currentTime}</div>
                        <hr>
            `;
      actionHistory.scrollTop = actionHistory.scrollHeight;
    } else if (data.ds_action === "LOG_ACTION_FAILED") {
      let reason = processText(data.reason);
      actionHistory.innerHTML += `
                        <div class="agent">${data.ds_action_by}</div>
                        <div>${message}</div>
                        <div>${reason}</div>
                        <div class="timestamp">${currentTime}</div>
                        <hr>
            `;
      actionHistory.scrollTop = actionHistory.scrollHeight;
    } else if (data.ds_action === "DISPLAY_LOG") {
      actionHistory.innerHTML += `
                    <div class="agent">${data.ds_action_by}</div>
                    <div>${message}</div>
                    <div class="timestamp">${currentTime}</div>
                    <hr>
        `;
      actionHistory.scrollTop = actionHistory.scrollHeight;
    } else if (data.ds_action === "SESSIONS_INFO") {
      updateSessionsInfo(data.message);
    } else if (data.ds_action === "ACTIONS_INFO") {
      updateActionsInfo(data.message);
    } else if (data.ds_action === "EFFECTS_INFO") {
      updateEffectsInfo(data.message);
    } else if (
      data.ds_action === "SEND_UTTERANCE_BY_ACTION" ||
      data.ds_action === "REQUEST_UTTERANCE_BY_STRING_MATCH"
    ) {
      
    } else if (data.ds_action === "SEND_UTTERANCE_BY_STRING_MATCH") {
      // addMessageToMessageBox(data.ds_action_by, message);
      document.getElementById("sendActionUtteranceInput").value = data.message;
    } else {
      addMessageToMessageBox(data.ds_action_by, message);
    }
  });
});

function showSelectScenarioPanel() {
  const scenariosListInModal = $("#scenariosListInModal")[0];
  scenariosListInModal.innerHTML = ''
  for (const [scenarioId, scenarioName] of Object.entries(
    scenarioIdsWithName
  )) {
    scenariosListInModal.innerHTML += `
        <button type="button" onclick="selectScenario('${scenarioId}')" class="list-group-item list-group-item-action">${scenarioName}</button>
        `;
  }
  $("#scenarioSelectionModal").modal("show");
}

function selectScenario(scenarioId) {
  sendMessageToApi("BUDGIE-WEB", "USER_CHOSE_SCENARIO", {
    scenario_id: scenarioId,
  });
  $("#scenarioSelectionModal").modal("hide");
  isDialogueStarted = false;
}

function showSelectAgentPanel() {
  const agentsListInModal = $("#agentsListInModal")[0];
  agentsListInModal.innerHTML = ''
  for (const [agentId, agentName] of Object.entries(agentIdsWithName)) {
    agentsListInModal.innerHTML += `
        <button type="button" onclick="selectAgent('${agentId}')" class="list-group-item list-group-item-action">${agentName}</button>
        `;
  }
  $("#agentSelectionModal").modal("show");
}

function selectAgent(agentId) {
  sendMessageToApi("BUDGIE-WEB", "USER_CHOSE_AGENT", { agent_id: agentId });
  sender_agent_id = agentId;
  $("#agentSelectionModal").modal("hide");
  document.getElementById("actingAs").innerHTML = agentIdsWithName[agentId]
  console.log(isDialogueStarted);
  if(isDialogueStarted == false){
    sendMessageToApi("BUDGIE-WEB", "START_DIALOGUE", {})
  }
}

function addMessageToMessageBox(messageBy, message) {
  const messageBox = document.getElementById("messageBox");
  var currentTime = new Date().toLocaleTimeString();
  messageBox.innerHTML += `
                <div class="agent">${messageBy}</div>
                <div>${message}</div>
                <div class="timestamp">${currentTime}</div>
                <hr>
            `;
  messageBox.scrollTop = messageBox.scrollHeight;
}

function updateActionsInfo(message) {
  let actionsBox = document.getElementById("actionsBox");
  // let actionToBuilt = document.getElementById('actionToBuilt');
  let actionslist = document.getElementById("actions-list");
  actionsBox.innerHTML = ``;
  let actionsBoxInnerHtml = ``;
  message.forEach((action) => {
    // actionsBoxInnerHtml += `${action["Name"]}`;
    actions.push(action);
    let action_id = "action-" + action["name"];
    action_ids.push(action_id);
    actionslist.innerHTML += `<li><a class="dropdown-item" href="#" onclick="chooseAction('${action_id}')">${action["name"]}</a></li>`;
    actionsBoxInnerHtml += `<div id="${action_id}">`;
    actions_from_id[action_id] = action;
    actionsBoxInnerHtml += `</div>`;
  });
  actionsBox.innerHTML = actionsBoxInnerHtml;
}

function updateEffectsInfo(message) {
  message.forEach((effect) => {
    effects.push(effect);
    let effect_id = "effect-" + effect["name"];
    effect_ids.push(effect_id);
    effects_from_id[effect_id] = effect;
  });
}

function setAttrForChosenAction(
  chosenActionId,
  paramName,
  paramType,
  paramValue
) {
  const ids = chosenActionId.split("-");

  let tmp = chosen_actions[ids[0]];

  tmp = tmp["parameters"];
  if (ids.length > 1) {
    for (let i = 1; i < ids.length; i++) {
      const param_name = param_id_to_name_map[ids[i]];
      const param_type = param_id_to_type_map[ids[i]];
      if (!(param_name in tmp)) {
        tmp[param_name] = {
          type: param_type,
          value: {},
        };
      }
      tmp = tmp[param_name]["value"];
    }
  }

  tmp[paramName] = { type: paramType, value: paramValue };
  // chosen_actions[chosenActionId]['parameters'][paramName] = {'type': paramType, 'value': paramValue};
  updateChosenActionTemplate(chosenActionId, paramName, paramType, paramValue);
}

function getUniqueId() {
  return Math.random().toString(16).slice(2);
}

function chooseAction(actionId) {
  let chosenActionElement = document.getElementById(actionId);
  // hideAllActions();
  chosenActionElement.style.display = "inline";
  const chosenActionId = getUniqueId();
  chosen_actions[chosenActionId] = {
    actionId: actionId,
    name: actionId.split("-")[1],
    parameters: {},
    template: actions_from_id[actionId]["template"],
    action: actions_from_id[actionId],
  };
  // chosen_actions[actionId]["name"] = actionId.split("-")[1]; // get the action name
  // chosen_actions[actionId]['parameters'] = {};
  // chosen_action_template = actions_from_id[actionId]["template"]
  showChosenActionTemplate(chosenActionId);
  updateSuggestedActionUtterance();
}

function showChosenActionTemplate(id) {
  let template = chosen_actions[id]["template"];
  const action = chosen_actions[id]["action"];
  for (const [paramName, paramEntries] of Object.entries(
    action["parameters"]
  )) {
    let actionsBoxInnerHtml = ``;
    actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${id}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;

    for (let paramEntry of paramEntries) {
      let paramValue = paramEntry["value"];
      let paramType = paramEntry["type"];

      if (paramType === "Information") {
        if (paramValue != null) {
          // escaped_attr = paramValue.replace("'", "\\'")
          actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}','${paramName}', '${paramType}', '${encodeURIComponent(
            JSON.stringify(paramEntry).replaceAll("'", "TMPQUOTE")
          )}')">${paramType}</a></li>`;
        }
      } else if (paramType === "Action") {
        paramValue.forEach((action_name) => {
          actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}','${paramName}', '${paramType}', '${action_name}')">${action_name}</a></li>`;
        });
      } else if (paramType === "Effect") {
        actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}','${paramName}', '${paramType}', '${encodeURIComponent(
          JSON.stringify(paramEntry).replaceAll("'", "TMPQUOTE")
        )}')">${paramValue}</a></li>`;
      } else {
        let escaped_attr = paramValue;
        if (paramValue != null) {
          if (typeof paramValue === "string") {
            escaped_attr = paramValue.replace("'", "\\'");
          }
          actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${id}', '${paramName}', '${paramType}', '${escaped_attr}')">${paramValue}</a></li>`;
        }
      }
    }

    actionsBoxInnerHtml += `</ul></div>`;
    template = template.replace("[" + paramName + "]", actionsBoxInnerHtml);
  }
  const deleteButton = `<div class="btn-group dropup">
                                    <button type="button" class="btn btn-outline-danger"
                                            aria-expanded="false"
                                            onclick=removeChosenAction('${id}')>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    </div>`;
  const createdAction =
    `<div id='${id}-block' class='box-border flex-nowrap overflow-auto'>` +
    deleteButton +
    `<p>` +
    action["name"] +
    `</p>` +
    template +
    `</div>`;
  document.getElementById("chosenActionBox").innerHTML += createdAction;
}

function createNewParameterBlock(
  id,
  blockParamName,
  blockParamType,
  blockParam
) {
  const blockId = getUniqueId();
  let template = "";
  let parameters = {};
  let blockName = "";
  if (blockParamType === "Information") {
    blockParam = JSON.parse(
      decodeURIComponent(blockParam.replaceAll("TMPQUOTE", "'"))
    );
    template = blockParam["template"];
    parameters = blockParam["value"]["parameters"];
    blockName = blockParamType;
  } else if (blockParamType === "Action") {
    const action = actions_from_id["action-" + blockParam]; // here, blockParam is the name of the action
    template = action["template"];
    parameters = action["parameters"];
    blockName = action["name"];
    blockParamType = blockParamType + "-" + blockName;
  } else if (blockParamType === "Effect") {
  }
  param_id_to_name_map[blockId] = blockParamName;
  param_id_to_type_map[blockId] = blockParamType;
  for (const [paramName, paramEntries] of Object.entries(parameters)) {
    let actionsBoxInnerHtml = ``;
    actionsBoxInnerHtml = `
                <div class="btn-group dropup">
                    <button id="${blockId}-${paramName}" type="button" class="btn btn-outline-dark dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        ${paramName}
                    </button>
                    <ul class="dropdown-menu">`;

    for (let paramEntry of paramEntries) {
      if (paramEntry == null) continue;
      let paramValue = paramEntry["value"];
      let paramType = paramEntry["type"];

      if (paramType === "Information") {
        if (paramValue != null) {
          // escaped_attr = paramValue.replace("'", "\\'")
          actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}-${blockId}','${paramName}', '${paramType}', '${encodeURIComponent(
            JSON.stringify(paramEntry).replaceAll("'", "TMPQUOTE")
          )}')">${paramType}</a></li>`;
        }
      } else if (paramType === "Action") {
        paramValue.forEach((action_name) => {
          actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}-${blockId}','${paramName}', '${paramType}', '${action_name}')">${action_name}</a></li>`;
        });
      } else if (paramType === "Effect") {
        paramValue.forEach((effect_name) => {
          actionsBoxInnerHtml += `<li><a class='dropdown-item' href='#' onclick="createNewParameterBlock('${id}-${blockId}','${paramName}', '${paramType}', '${effect_name}')">${effect_name}</a></li>`;
        });
      } else {
        let escaped_attr = paramValue;
        if (paramValue != null) {
          if (typeof paramValue === "string") {
            escaped_attr = paramValue.replace("'", "\\'");
          }
          actionsBoxInnerHtml += `<li><a class="dropdown-item" href="#" onclick="setAttrForChosenAction('${id}-${blockId}', '${paramName}', '${paramType}', '${escaped_attr}')">${paramValue}</a></li>`;
        }
      }
    }

    actionsBoxInnerHtml += `</ul></div>`;
    template = template.replace("[" + paramName + "]", actionsBoxInnerHtml);
  }
  const deleteButton = `<div class="btn-group dropup">
                                    <button type="button" class="btn btn-outline-danger"
                                            aria-expanded="false"
                                            onclick=removeChosenAction('${blockId}')>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    </div>`;
  const createdAction =
    `<div id='${blockId}-block' class='box-border'>` +
    deleteButton +
    `<p>` +
    blockName +
    `</p>` +
    template +
    `</div>`;
  document.getElementById(id.split("-").slice(-1)[0] + "-block").innerHTML +=
    createdAction;
}

function removeChosenAction(chosenActionId) {
  delete chosen_actions[chosenActionId];
  document.getElementById(chosenActionId + "-block").remove();
  updateSuggestedActionUtterance();
}

function updateChosenActionTemplate(
  chosenActionId,
  paramName,
  paramType,
  paramValue
) {
  document.getElementById(
    chosenActionId.split("-").slice(-1)[0] + "-" + paramName
  ).innerHTML = paramValue;
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
  message.forEach((session) => {
    let start_conditions_str = `<ul>`;
    session.start_conditions.forEach((start_condition) => {
      start_conditions_str += `<li>(${start_condition.status}) ${start_condition.condition}</li>`;
    });
    start_conditions_str += `</ul>`;

    let expectations_str = `<ul>`;
    session.expectations.forEach((expectation) => {
      expectations_str += `<li>(${expectation.status}) ${expectation.expectation}</li>`;
    });
    expectations_str += `</ul>`;

    let end_goals_str = `<ul>`;
    session.end_goals.forEach((end_goal) => {
      end_goals_str += `<li>(${end_goal.status}) ${end_goal.end_goal}</li>`;
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
    editor.addNode(
      `session${session_ix}`,
      1,
      1,
      pos_x + pos_x_space * session_ix,
      pos_y,
      "github",
      data,
      html
    );
    session_ix += 1;
  });
  // for (let i = session_ix; i > 0; i--) {
  //     editor.addConnection(`session${i}`, `session${i - 1}`, 'output_1', 'input_1');
  // }
}

function processText(text) {
  if (typeof text === "string" || text instanceof String) {
    // /abc/g is a regex which basically does replaceAll(abc, def)
    text = text
      .toString()
      .replaceAll("\n", `</br>`)
      .replaceAll("failed", `<span class="text-danger">failed</span>`)
      .replaceAll("completed", `<span class="text-success">completed</span>`);
  }
  return text;
}

function sendMessage() {
  var messageInput = document.getElementById("sendMessageInput");
  var messageBox = document.getElementById("messageBox");
  const sendActionUtteranceInput = document.getElementById(
    "sendActionUtteranceInput"
  );

  // Check if the input box is empty
  if (messageInput.value.trim() === "") {
    return;
  }

  // Get current time
  // Scroll to the bottom of the message box
  messageBox.scrollTop = messageBox.scrollHeight;

  // Disable the send button again after sending
  document.getElementById("sendMessageButton").disabled = true;

  sendMessageToApi("AGENT", "USER_SENT_UTTERANCE", messageInput.value);
  // Clear the input text box
  messageInput.focus();
  addMessageToMessageBox(getAgentNameById(sender_agent_id), messageInput.value);
  messageInput.value = "";
  sendActionUtteranceInput.value = "";
  // messageInput.focus();
}

function getAgentNameById(agentId){
  return agentIdsWithName[agentId]
}

function sendAction() {
  const sendActionButton = document.getElementById("sendActionButton");
  const sendActionUtteranceInput = document.getElementById(
    "sendActionUtteranceInput"
  );
  const sendMessageInput = document.getElementById("sendMessageInput");

  // if the filled in template include a square bracket [, then there exists some values yet to be filled in

  // sendActionButton.disabled = document.getElementById('chosenActionBox').innerHTML.toString().includes("[");

  if (!sendActionButton.disabled) {
    sendMessageInput.focus();
    addMessageToMessageBox(getAgentNameById(sender_agent_id), sendMessageInput.value);
    sendMessageInput.value = "";
    sendActionUtteranceInput.value = "";
    sendMessageToApi(
      "AGENT",
      "USER_CHOSE_ACTIONS",
      JSON.stringify(Object.values(chosen_actions))
    );
  } else {
    sendActionUtteranceInput.value = "";
  }
}

$("#sendMessageInput").on("keypress", function (event) {
  if (event.which === 13) {
    event.preventDefault();
    sendMessage();
  }
});

function selectOption(selectedOption, ds_action) {
  // Send the selected option to the server
  $("#select-menu-option").remove();
  sendMessageToApi("AGENT", ds_action, JSON.stringify(selectedOption));
}

function displayOptions(options, ds_action) {
  var messageBox = document.getElementById("messageBox");

  let menu_options = `<div id="select-menu-option" class="d-flex flex-column p-2">`;
  // Create buttons for each option
  options.forEach((option) => {
    menu_options += `
            <button style="white-space: normal;" class="btn btn-outline-dark option-button m-1" onclick="selectOption('${option}', '${ds_action}')">${option}</button>
        `;
  });
  menu_options += `</div>`;
  messageBox.innerHTML += menu_options;

  // Scroll to the bottom of the message box
  messageBox.scrollTop = messageBox.scrollHeight;
}

function toggleSendButton() {
  const sendButton = document.getElementById("sendButton");
  const messageInput = document.getElementById("sendMessageInput");
  sendButton.disabled = !messageInput.value.trim();
}

function updateSuggestedActionUtterance() {
  const sendActionButton = document.getElementById("sendActionButton");
  const sendActionUtteranceInput = document.getElementById(
    "sendActionUtteranceInput"
  );

  // if the filled in template include a square bracket [, then there exists some values yet to be filled in

  // sendActionButton.disabled = document.getElementById('chosenActionBox').innerHTML.toString().includes("[");

  sendActionUtteranceInput.value = "";
  if (!sendActionButton.disabled) {
    sendMessageToApi(
      "AGENT",
      REQUEST_UTTERANCE_BY_ACTION,
      JSON.stringify(Object.values(chosen_actions))
    );
  } else {
    sendActionUtteranceInput.value = "";
  }
}

$("#sendMessageInput").on("input", function () {
  updateSuggestedActionUtteranceByInput($(this).val());
});

function updateSuggestedActionUtteranceByInput(inputText) {
  // const sendActionButton = document.getElementById('sendActionButton');
  const sendMessageInput = document.getElementById("sendMessageInput");
  document.getElementById("sendMessageButton").disabled = sendMessageInput.value === "";
  sendMessageToApi(
    "AGENT",
    "REQUEST_UTTERANCE_BY_STRING_MATCH",
    JSON.stringify(inputText)
  );
}

function sendMessageToApi(ds_action_by_type, dsAction, message) {
  let data = {
    ds_action_by_type: ds_action_by_type,
    ds_action_by: sender_agent_id,
    ds_action: dsAction,
    session_id: session_id,
    message: message,
  };

  fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Response from server:", data);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}
