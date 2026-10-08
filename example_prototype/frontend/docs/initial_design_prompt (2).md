# HORUS

## OVERVIEW
Horus is an app for military planners to quickly generate and visualize operational plans using a set of tools, and interactive map and a conversational AI Agent.

**Note**
This is a prototype application built for demonstration purposes.
It uses mock-data to simulate the experience of a real-world application.

## REQUIREMENTS
### General
- Folders structure of the project is folders-by-feature, meaning that each feature (e.g. Plans, Calendar, Intelligence, etc.) has its own folder with all the related components, hooks, and styles.
  - A "common" folder will contain shared components, hooks, and styles that are used across multiple features.
  - A single mock data JSON file will be used to store all the mock data for the app, and will be imported into the relevant features as needed.
- The app will be multi-lingual and support English and Hebrew (right-to-left).
- The app will follow the Material 3 design system, and will be responsive to different screen sizes (mobile, tablet, desktop). 
- The app's main layout will consist of a sidebar on the left, and a main content area on the right. The sidebar will be collapsible, and the main content area will have a chat panel on the left, and content on the right.
  - When in Hebrew, everything will be right-to-left, meaning the sidebar will be on the right, and the chat panel will be on the right as well, and the content will be on the left.
- A hard-coded login screen will allow a specific user/pass to enter the app (client-side authentication using local storage only).

### AI Agent
The app will have a conversational AI Agent that can be accessed from the chat panel on the left.
The agent will be able to answer questions about the plan, and provide recommendations based on the data in the plan.
The agent will also be able to perform actions on the plan, such as adding a task, or updating the tasks.

**AI Framework**
We will use [Google GenKit](https://genkit.dev/) framework to build our App's AI Agent.

### Sidebar
- The sidebar will have the following tools:
  - Plans
  - Calendar
  - Intelligence
  - Objective & Mission
  - Tasks

### Plans Screen
A list of existing plans with the ability to create or delete. Editing a plan means to load it into the "scope", and this affects all the other tools.

### Definitions Screen
Once a plan is loaded into the scope, the "Definitions" tool will allow to define the main parameters of the plan, such as the D-day, H-Hour, Phases, and Forces involved in the plan. This will be used later on in the calendar and map tools to visualize the plan.

The Definitions screen will have 5 "cards":
- **Plan Details Card:** Name, Description, D-day, H-Hour, Phases (relative to the D-day and H-Hour).
- **Units Card:** A list of units involved in the plan, with the ability to add or remove units. Each unit is selected from a dropdown (with auto-complete) and has a Name.
- **Color Legend:** A simple color legend to assign colors to the different units levels, and use them in the map and calendar.
- **Presentation Checklist:** A checklist of items to display when presenting the plan, with the ability to check/uncheck items.

### Calendar Screen
The Calendar screen is a simple calendar-style tool allowing to plan the main events of the planning procedure.

### Intelligence Screen
The Intelligence screen will display the MPCOA and MDCOA for the current plan in scope,

The screen will have 2 cards:
- MPCOA (Most Probable Course of Action)
- MDCOA (Most Dangerous Course of Action)

Each card will have the following fields:
- Threat: A short summary of the potential threat.
- Sequence of Events: A list of events that are expected to happen in this COA.
- Recommended Actions: A list of recommended actions to take in response to this COA.

### Objective & Mission
The Objective & Mission screen will display the objective and mission for the current plan in scope.

The screen will have 2 cards:
- Objective Card: A textarea with the objective of the plan.
- Mission Card: A textarea with the mission of the plan.

A button "Rephrase with AI" will allow to rephrase the objective and mission using AI, and will update the textareas with the new text.

### Tasks Screen
An interactive timeline / roadmap tool, allowing to visualize the tasks of the plan, and their dependencies.

The Tasks screen will have 3 views (very much like the Projects in Github):
- Timeline: An interactive Gantt chart / Roadmap, allowing to drag and drop events, and to create dependencies between events.
- List: A simple list of tasks, with the ability to add or remove tasks, and to edit their properties (including sub-tasks).
- Board: A Kanban-style board, allowing to move tasks between different columns (e.g. To Do, Blocked, In Progress, Done).
- Map: A map view, allowing to visualize the tasks on a map, based on their geo-coordinates.

A task has the following properties:
- Name.
- Description.
- Status: To Do, Blocked, In Progress, Done.
- Start Date (relative to the D-day and H-Hour).
- End Date (relative to the D-day and H-Hour).
- Primary unit (the main unit responsible for the task).
- Secondary units (other units involved in the task).
- Dependencies (other tasks that this task depends on).
- Geo-coordinates (for visualization on the map).
  - This may be a single point, or a polygon (for areas of operation).