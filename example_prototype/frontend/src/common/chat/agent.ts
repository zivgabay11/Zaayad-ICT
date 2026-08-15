import { GoogleGenAI, Type } from '@google/genai';
import { Plan, CalendarEvent } from '../utilities/types';
import { Message } from '../utilities/types';

// Client-side initialization
// Assuming VITE_GEMINI_API_KEY is properly injected by Vite.
const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

export interface MapAnalysisContext {
    toolName: string;
    tab: string;
    summary: any; // structured mock analysis results
}

export interface AgentRequest {
    messages: Message[];
    activePlan: Plan | null;
    currentSection?: string;
    language?: string;
    docFiles?: { name: string; base64: string; mimeType: string }[];
    mapAnalysis?: MapAnalysisContext;
}

export interface ProposedUpdate {
    path: string;
    value: any;
}

export interface AgentResponse {
    response: string;
    updatedPlan?: Plan;
    proposedUpdates?: ProposedUpdate[];
    navigateTo?: string;
}

export async function horusAgentFlow(request: AgentRequest): Promise<AgentResponse> {
    const { messages, activePlan, currentSection, language, docFiles, mapAnalysis } = request;

    if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is missing. Please configure it in your environment.');
    }

    const currentDate = new Date().toLocaleString();
    const systemInstruction = `You are Horus - an expert military planning assistant.

General:
- You can help them manage their plans, update properties, search the plan, and give strategic advice.
- You can analyze images and files that the user uploads. Describe what you see or extract relevant information from them when asked.
- To get information about the screen they are on, use the 'getCurrentScreen' tool.
- To load plan information, use the 'searchPlan' tool.
- To update a specific field on the plan, use the 'updatePlanProperty' tool.
- When managing calendar events, you MUST first use 'searchPlan' with property 'calendarEvents' to get the latest events, then use the dedicated calendar tools (addCalendarEvent, updateCalendarEvent, deleteCalendarEvent) - NOT updatePlanProperty.
- When managing calendar events, make sure you parse dates as YYYY-MM-DD and times as HH:MM. Ensure consistent tones and a helpful, concise demeanor.

Context:
- The current date and time is: ${currentDate}.
- The user is currently planning: ${activePlan ? (activePlan.name?.[language as keyof typeof activePlan.name] || activePlan.name?.['en'] || 'Unknown') : 'No active plan'}.
- Always respond to the user in ${language == 'en' ? 'English' : 'Hebrew'}.

Documents:
- The user may have a document open in their document panel. If document content is provided at the start of the conversation, you have full access to it and should use it to answer questions.
- When referencing the document, refer to it by its filename.

Instructions:
- Always use the provided tools to interact with the plan data instead of asking the user for information you can retrieve or update yourself.
- If the user asks for information, try to find it in the active plan and provide it. If it's not there, say you don't have that information.
- If the user wants to make a change, propose the change using the appropriate tool. Don't make assumptions - if you need to clarify, ask the user.
- Be concise and clear in your responses. Provide actionable advice when asked for recommendations.
- Keep your responses as short and brief as possible.
`;
    // - Use emojis a little bit.
    // - Be cool, a little bit funny and sarcastic.

    // Convert our internal Message format to the format required by the GenAI SDK
    const history: any[] = [];

    // Prepend document context if the user has a document open in the Doc Panel
    if (docFiles && docFiles.length > 0) {
        const docNames = docFiles.map(f => f.name).join(', ');
        const docParts: any[] = [
            { text: `[The following document is currently open in my document panel: ${docNames}]` },
            ...docFiles.map(f => ({ inlineData: { mimeType: f.mimeType, data: f.base64 } }))
        ];
        history.push({ role: 'user', parts: docParts });
        history.push({ role: 'model', parts: [{ text: `I have access to the document "${docNames}" and can answer questions about its content.` }] });
    }

    // Append actual conversation messages
    for (const msg of messages) {
        const parts: any[] = [];
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        if (msg.attachmentData && msg.attachmentData.length > 0) {
            for (const att of msg.attachmentData) {
                parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
            }
        }
        if (parts.length === 0) {
            parts.push({ text: '' });
        }
        history.push({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts
        });
    }

    const addCalendarEventTool = {
        name: 'addCalendarEvent',
        description: 'Adds a new event to the active plan calendar.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'Event title' },
                date: { type: Type.STRING, description: 'Event date (YYYY-MM-DD)' },
                time: { type: Type.STRING, description: 'Event time (HH:MM)' },
                level: { type: Type.STRING, description: 'Command level (e.g., brigade, division, command)' },
                location: { type: Type.STRING, description: 'Location of event' },
            },
            required: ['title', 'date', 'time', 'level', 'location']
        }
    };

    const updateCalendarEventTool = {
        name: 'updateCalendarEvent',
        description: 'Updates an existing event in the active plan calendar.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'The unique event ID to update' },
                title: { type: Type.STRING, description: 'Event title' },
                date: { type: Type.STRING, description: 'Event date (YYYY-MM-DD)' },
                time: { type: Type.STRING, description: 'Event time (HH:MM)' },
                level: { type: Type.STRING, description: 'Command level (e.g., brigade, division, command)' },
                location: { type: Type.STRING, description: 'Location of event' },
            },
            required: ['id']
        }
    };

    const deleteCalendarEventTool = {
        name: 'deleteCalendarEvent',
        description: 'Deletes an event from the active plan calendar.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'The unique event ID to delete' }
            },
            required: ['id']
        }
    };

    const getCurrentScreenTool = {
        name: 'getCurrentScreen',
        description: 'Tells the agent what screen the user is currently on as well as which plan properties to fetch.',
        parameters: { type: Type.OBJECT, properties: {} }
    };

    const searchPlanTool = {
        name: 'searchPlan',
        description: 'Searches and retrieves specific properties from the current active plan.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                property: { type: Type.STRING, description: 'The property path to fetch' }
            },
            required: ['property']
        }
    };

    const getMapAnalysisResultsTool = {
        name: 'getMapAnalysisResults',
        description: 'Retrieves the structured results of the map analysis tool the user just ran on the map (terrain / enemy / mission planning analysis). Use this to write narrative text for the relevant plan field.',
        parameters: { type: Type.OBJECT, properties: {} }
    };

    const updatePlanPropertyTool = {
        name: 'updatePlanProperty',
        description: 'Proposes an update to a specific property in the plan.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The property path to update (e.g., "general", "objective", "method")' },
                value: { type: Type.STRING, description: 'The new value to set, usually a JSON string for objects.' }
            },
            required: ['path', 'value']
        }
    };

    let baseTools = [getCurrentScreenTool, searchPlanTool, updatePlanPropertyTool];
    if (mapAnalysis) {
        baseTools = [...baseTools, getMapAnalysisResultsTool];
    }
    const tools = [{
        functionDeclarations: currentSection === 'calendar'
            ? [...baseTools, addCalendarEventTool, updateCalendarEventTool, deleteCalendarEventTool]
            : baseTools
    }];

    try {
        let updatedPlan = activePlan;
        let proposedUpdates: ProposedUpdate[] = [];
        let finalResponseText = '';
        let navigateTo: string | undefined;

        // Map property paths to their relevant screens
        const pathToScreen: Record<string, string> = {
            general: 'general',
            objective: 'objective',
            mission: 'mission',
            designatedOperationalConcept: 'objective',
            method: 'method',
            operationalIdea: 'method',
            enemy: 'intelligence',
            terrain: 'intelligence',
            mpcoa: 'intelligence',
            mdcoa: 'intelligence',
            calendarEvents: 'calendar',
            tasks: 'tasks',
            phases: 'definitions',
            units: 'definitions',
        };

        for (let turn = 0; turn < 4; turn++) {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: history,
                config: {
                    systemInstruction,
                    tools,
                    temperature: 1.0,
                }
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                history.push({
                    role: 'model',
                    parts: response.candidates?.[0]?.content?.parts || []
                });

                const functionResponses: any[] = [];

                for (const call of response.functionCalls) {
                    const { name, args } = call;
                    let result: any = { status: 'executed' };

                    if (!updatedPlan || !args) {
                        result = { error: 'Missing plan or arguments' };
                    } else if (name === 'getCurrentScreen') {
                        result = { screen: currentSection || 'general' };
                    } else if (name === 'getMapAnalysisResults') {
                        result = mapAnalysis
                            ? { toolName: mapAnalysis.toolName, tab: mapAnalysis.tab, results: mapAnalysis.summary }
                            : { error: 'No map analysis results available' };
                    } else if (name === 'searchPlan') {
                        const prop = args.property as keyof Plan;
                        result = { data: updatedPlan[prop] || null };
                    } else if (name === 'updatePlanProperty') {
                        const path = args.path as string;
                        let valStr = args.value as string;
                        let parsedValue: any = valStr;
                        try { parsedValue = JSON.parse(valStr); } catch (e) { }

                        // Calendar events should use dedicated tools, but if the model
                        // mistakenly uses updatePlanProperty, apply directly instead of proposing
                        if (path === 'calendarEvents' && Array.isArray(parsedValue)) {
                            updatedPlan = { ...updatedPlan, calendarEvents: parsedValue };
                            result = { success: true, message: `Calendar events updated directly.` };
                        } else {
                            // Wrap primitive strings in the localized Record format our UI components expect
                            if (typeof parsedValue === 'string') {
                                parsedValue = { [language || 'en']: parsedValue, [language === 'he' ? 'en' : 'he']: parsedValue };
                            }

                            proposedUpdates.push({ path, value: parsedValue });
                            result = { success: true, message: `Proposed update to ${path} has been staged.` };
                        }

                        // Navigate to the relevant screen if needed
                        const targetScreen = pathToScreen[path];
                        if (targetScreen && targetScreen !== currentSection) {
                            navigateTo = targetScreen;
                        }
                    } else {
                        // Calendar Mutations
                        let newEvents: CalendarEvent[] = [...(updatedPlan.calendarEvents || [])];
                        if (name === 'addCalendarEvent') {
                            const localizedTitle = typeof args.title === 'string' ? { en: args.title, he: args.title } : (args.title || { en: 'New Event', he: 'New Event' });
                            const newEvent = { ...args, title: localizedTitle, id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` } as unknown as CalendarEvent;
                            newEvents.push(newEvent);
                            result = { success: true, eventId: newEvent.id };
                        } else if (name === 'updateCalendarEvent') {
                            const localizedTitle = args.title ? (typeof args.title === 'string' ? { en: args.title, he: args.title } : args.title) : undefined;
                            newEvents = newEvents.map(e => {
                                if (e.id === args.id) {
                                    const updated = { ...e, ...(args as Partial<CalendarEvent>) };
                                    if (localizedTitle) updated.title = localizedTitle as Record<string, string>;
                                    return updated;
                                }
                                return e;
                            });
                            result = { success: true };
                        } else if (name === 'deleteCalendarEvent') {
                            newEvents = newEvents.filter(e => e.id !== args.id);
                            result = { success: true };
                        }
                        updatedPlan = { ...updatedPlan, calendarEvents: newEvents };

                        // Navigate to calendar if not already there
                        if (currentSection !== 'calendar') {
                            navigateTo = 'calendar';
                        }
                    }

                    functionResponses.push({
                        functionResponse: {
                            name,
                            response: result
                        }
                    });
                }

                history.push({
                    role: 'user',
                    parts: functionResponses
                });

            } else {
                finalResponseText = response.text || '';
                break;
            }
        }

        return {
            response: finalResponseText,
            updatedPlan: (updatedPlan !== activePlan && updatedPlan !== null) ? updatedPlan : undefined,
            proposedUpdates: proposedUpdates.length > 0 ? proposedUpdates : undefined,
            navigateTo
        };
    } catch (error) {
        console.error('Agent invocation failed', error);
        throw error;
    }
}
