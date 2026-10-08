# HORUS | EXAMPLE PROTOTYPE

## OVERVIEW
Zaayad is an app for military planners to quickly generate and visualize operational plans using a set of tools, and interactive map and a conversational AI Agent.

**Note**
This is a prototype application built for demonstration purposes.
It uses mock-data to simulate the experience of a real-world application.

## GETTING STARTED
**Prerequisites:**
- Install VSCode: https://code.visualstudio.com/
- Install Claude Code and Git Graph Extensions in VSCode:
  - Open VSCode, click on the Extensions icon in the left sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X` on Mac).
  - Search for "Claude Code" (by `Anthropic`) and "Git Graph" (by `mhutchie`) and install them.
- Install [Node.js](https://nodejs.org/en/download)
  - Verify it's working in the terminal:  
    From VSCode menu choose Terminal > New Terminal and run:
    ```
    node --version
    ```
- Install Git: https://git-scm.com/install/
  - For Mac users: Git is usually pre-installed.  
    You can check by running `git --version` in Terminal.  
    If not installed, use Homebrew: `brew install git` (to install Homebrew, see https://brew.sh/).
  - For Windows users:
    - During installation, select all the default options during installation.
    - Configure Git Bash as the default terminal in VSCode:
      - Open the command palette (`F1` or `Ctrl+Shift+P` / `Cmd+Shift+P` on Mac).
      - Type `Terminal: Select Default Profile` and select it.
      - Choose `Git Bash` from the list.
  - **[ ! ] Close VSCode and re-open it.**
  - Verify it's working by clicking the "Source Control" icon in the left sidebar (shortcut: Ctrl+Shift+G / Cmd+Shift+G on Mac).
  - Verify it's working in the terminal:  
    From VSCode menu choose Terminal > New Terminal and run:
    ```
    git --version
    ```
- Configure your Git identity:  
Run these commands in the terminal (use the email associated with your GitHub account):
```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
- Create a local "Development" folder on your laptop (e.g. `C:\Development`).
  - Inside it, create a sub-folder `stealth-200`.
- Sign-in to [Github](https://github.com/).
  - Create an account if you don't have one.
  - Authenticate VSCode with GitHub:  
    Click the "Github Copilot" icon in the bottom-right corner of VSCode and sign-in.
    
    <img width="509" height="202" alt="Screenshot 2026-07-07 at 19 23 36" src="https://github.com/user-attachments/assets/323232cf-5867-4f79-b838-e2fdaf5e822c" />

- Clone the desired repository to your local machine (e.g. https://github.com/stealth-200/sandbox):
  - Goto the repository page on Github and copy the URL from the "Code" button.
  - From VSCode, open the Command Palette (`F1` or `Ctrl+Shift+P` / `Cmd+Shift+P` on Mac).
  - Type `Git: Clone` and select it.
  - Paste the repository URL.
  - If a browser window opens asking you to authorize VSCode to access GitHub, click "Allow" / "Authorize".
  - Choose your "Development" folder as the destination.
  - Once cloned - it will ask you to open the repository - click "Open".
  - Select "Trust the authors of the files in the parent folder" and click "Yes, I trust the authors".
  - **Troubleshooting Clone Errors:**  
    If the clone fails with a `403` or "Permission Denied" error, ensure you have accepted the GitHub collaborator invite via email and that you signed in correctly.
  - **Note**  
    If you missed the "Trust the authors" prompt, you can add the folder from the VSCode menu - choose File > Open Folder > select the `Development/stealth-200/sandbox` folder in VSCode.
- Save the VSCode Workspace:  
  Choose "File > Save Workspace As..." > Navigate to your Development folder > save it as `stealth-200_sandbox.code-workspace`.  
  Now, you can always open the project by choosing "File > Open Workspace from File..." and selecting the saved workspace file.

**Then:**
1. Open the terminal in VSCode (Terminal > New Terminal) and navigate to the `frontend` folder:
   `cd example_prototype/frontend`
2. Install dependencies:
   `npm install`
3. Run the app:
   `npm run dev`
4. Open your browser and go to `http://localhost:4000/` to see the app running.

**(Optional)**
Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.  
(Ask Oren for the key if you don't have one).
