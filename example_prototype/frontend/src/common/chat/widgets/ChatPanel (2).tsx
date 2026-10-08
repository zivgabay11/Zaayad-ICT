import React, { useState, useEffect, useMemo } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { Message, Attachment, Plan } from '../../utilities/types';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../context/PlanContext';
import { useDocContext } from '../../context/DocContext';
import { horusAgentFlow } from '../agent';

interface ChatPanelProps {
    activePlan: Plan | null;
    currentSection?: string;
    onNavigate?: (section: string) => void;
    onHide?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ activePlan, currentSection, onNavigate, onHide }) => {
    const { t, i18n } = useTranslation();
    const { updatePlan, proposeUpdate } = usePlanContext();
    const { isDocOpen, files, activeFileId } = useDocContext();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Convert the active doc file to base64 for the agent context
    const docFiles = useMemo(() => {
        if (!isDocOpen || !activeFileId) return undefined;
        const activeFile = files.find(f => f.id === activeFileId);
        if (!activeFile) return undefined;
        // Convert Uint8Array to base64 string
        let binary = '';
        const bytes = activeFile.data;
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return [{ name: activeFile.name, base64, mimeType: 'application/pdf' }];
    }, [isDocOpen, activeFileId, files]);

    useEffect(() => {
        const fetchWelcomeMessage = async () => {
            setMessages([]);
            setIsTyping(true);

            try {
                const data = await horusAgentFlow({
                    messages: [{
                        id: `user-${Date.now()}`,
                        role: 'user',
                        text: 'Hey!',
                    }],
                    activePlan,
                    currentSection,
                    language: i18n.language,
                    docFiles
                });

                setMessages([{
                    id: `ai-${Date.now()}`,
                    role: 'ai',
                    text: data.response
                }]);
            } catch (error) {
                console.error('Welcome message error:', error);
                setMessages([{
                    id: 'welcome-msg',
                    role: 'ai',
                    text: 'Hello! I am Horus AI. How can I help you with your planning today?'
                }]);
            } finally {
                setIsTyping(false);
            }
        };

        fetchWelcomeMessage();
    }, [activePlan?.id, i18n.language]);

    const handleSend = async (text: string, attachments: Attachment[]) => {
        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            text,
            attachments: attachments.map(a => a.name),
            attachmentData: attachments.map(({ name, base64, mimeType }) => ({ name, base64, mimeType }))
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setIsTyping(true);

        try {
            const data = await horusAgentFlow({
                messages: updatedMessages,
                activePlan,
                currentSection,
                language: i18n.language,
                docFiles
            });

            if (data.updatedPlan && activePlan) {
                updatePlan(activePlan.id, data.updatedPlan);
            }
            if (data.proposedUpdates) {
                data.proposedUpdates.forEach(update => {
                    proposeUpdate(update.path, update.value);
                });
            }
            if (data.navigateTo && onNavigate) {
                onNavigate(data.navigateTo);
            }

            const aiMsg: Message = {
                id: `ai-${Date.now()}`,
                role: 'ai',
                text: data.response
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: 'ai',
                text: 'Sorry, I encountered an error answering your request. Please check your Gemini API key.'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <ChatSidebar
            messages={messages}
            isTyping={isTyping}
            onSend={handleSend}
            onHide={onHide}
            placeholder={t('chat.placeholder') || "Your Message..."}
            disclaimer={t('chat.disclaimer') || "Horus AI Agent can make mistakes, so double-check it."}
        />
    );
};