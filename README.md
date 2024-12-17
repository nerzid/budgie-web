# Budgie-Web

**Budgie-Web** is a web interface built using Django for Budgie, an advanced interaction management system designed to handle natural dialogues. The project serves as a bridge between users and Budgie, offering a seamless, responsive, and efficient web-based experience for managing interactions.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Features

- **Free-Text and Custom Actions**: Users can send messages in free-text format or create custom actions to send instead of text. 
- **Predefined Utterance Preview**: If a created action matches predefined utterances in the scenario, a preview of the utterance is shown.
- **Asynchronous Action Processing**: No turn-taking is required; actions are sent and processed asynchronously, allowing for smooth and dynamic interactions.
- **Agent Selection**: Users can choose any agent at any time to interact with the dialogue system. The system automatically picks the other available agent to respond.
- **Scenario Selection and Restart**: Users can choose any available scenario and restart the dialogue for the chosen scenario at any time.
- **Session Management**: Users can switch between "Chat" and "Sessions" tabs to interact with the dialogue system or view session information.

To start, the user needs to:

1. Choose a scenario.
2. Select an agent.
3. Begin the dialogue.

## Requirements

Before you begin, ensure you have the following dependencies installed:

- [Budgie](https://github.com/nerzid/budgie) as base API for managing dialogues and interactions
- [Budgie Socket Server](https://github.com/nerzid/budgie-socket-server) for handling asynchronous data

## Installation

Follow these steps to set up and run Budgie-Web locally:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/nerzid/Budgie-Web.git
   cd Budgie-Web
   ```

2. **Create a Virtual Environment** (optional but recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows use `venv\Scripts\activate`
   ```

3. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Set Up Environment Variables**:
   Create a `.env` file in the project root directory and add your configuration:

   ```
   DEBUG=True
   SECRET_KEY=your-secret-key
   ALLOWED_HOSTS=127.0.0.1,localhost
   BUDGIE_API_URL=http://localhost:8000/api/
   ```

5. **Apply Database Migrations**:

   ```bash
   python manage.py migrate
   ```

6. **Run the Development Server**:

   ```bash
   python manage.py runserver
   ```

   Access the project at `http://127.0.0.1:8000/`.

## Usage

Ensure [Budgie](https://github.com/nerzid/budgie) and [Budgie Socket Server](https://github.com/nerzid/budgie-socket-server) are running.

- **To Start a Dialogue**:
   1. Choose a scenario.
   2. Select an agent.
   3. Interact freely with the dialogue system.
- **Manage Interactions**: Send messages in free-text or create custom actions. Matched actions show previews of predefined utterances.
- **Session and Chat Tabs**: Switch between the "Chat" tab to interact and the "Sessions" tab to view session details.
- **Restart Scenarios**: Restart dialogues for the chosen scenario at any time.
- **Agent Switching**: Choose any agent dynamically during interactions.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add your feature description"
   ```

4. Push to your branch and open a Pull Request.

## Contact

For questions, issues, or feedback, reach out to me:

- **Name**: Eren
- **Email**: [nerzid@gmail.com](mailto:nerzid@gmail.com)
- **GitHub**: [nerzid](https://github.com/nerzid)

---

Enjoy building with Budgie-Web! ✨