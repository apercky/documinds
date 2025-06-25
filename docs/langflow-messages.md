# Complete Langflow Chat System Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Data Schemas](#core-data-schemas)
3. [Message Processing Pipeline](#message-processing-pipeline)
4. [State Management](#state-management)
5. [Component Architecture](#component-architecture)
6. [Content Rendering System](#content-rendering-system)
7. [File Handling System](#file-handling-system)
8. [Streaming Implementation](#streaming-implementation)
9. [UI Components Specifications](#ui-components-specifications)
10. [Backend Integration](#backend-integration)
11. [Error Handling](#error-handling)
12. [Performance Optimizations](#performance-optimizations)
13. [Implementation Checklist](#implementation-checklist)

## Overview

The Langflow chat system is a sophisticated real-time messaging interface that supports multiple content types, file attachments, streaming responses, and rich interactive elements. It's designed to handle AI agent conversations with complex data structures and provides a seamless user experience for both simple text exchanges and complex multi-modal interactions.

### Key Features
- Multi-type content rendering (text, code, JSON, media, tools, errors)
- Real-time streaming responses with partial updates
- File upload and display with drag-and-drop support
- Session management and message persistence
- Message editing and feedback system
- Voice assistant integration
- Rich content blocks with expandable UI
- Error handling with actionable feedback
- Responsive design with dark mode support

## Core Data Schemas

### 1. Primary Message Interface

```typescript
export type ChatMessageType = {
  // Core message content - can be string or complex object
  message: string | Object;
  
  // Optional template for custom rendering
  template?: string;
  
  // Determines message direction (true = user, false = AI/system)
  isSend: boolean;
  
  // AI reasoning or thinking process (for transparency)
  thought?: string;
  
  // File attachments - can be file objects or path strings
  files?: Array<{
    path: string;
    type: string;
    name: string;
  } | string>;
  
  // Original prompt that generated this message
  prompt?: string;
  
  // Unique identifier for chat context
  chatKey?: string;
  
  // ID of component that generated this message
  componentId?: string;
  
  // Unique message identifier (UUID)
  id: string;
  
  // ISO timestamp string
  timestamp: string;
  
  // URL for streaming responses (null when not streaming)
  stream_url?: string | null;
  
  // Display name for message sender
  sender_name?: string;
  
  // Session identifier for grouping messages
  session?: string;
  
  // Flag indicating if message was edited
  edit?: boolean;
  
  // Icon identifier for message type
  icon?: string;
  
  // Message category for special handling
  category?: "message" | "error" | "warning" | "info" | "audio";
  
  // Additional properties for styling and metadata
  properties?: PropertiesType;
  
  // Rich content blocks for complex data
  content_blocks?: ContentBlock[];
};
```

### 2. Properties Schema

```typescript
export type PropertiesType = {
  // Source information for message origin
  source: {
    id: string;
    display_name: string;
    source: string;
  };
  
  // Optional icon override
  icon?: string;
  
  // Custom background color (hex or CSS color)
  background_color?: string;
  
  // Custom text color (hex or CSS color)
  text_color?: string;
  
  // Target component IDs for navigation
  targets?: string[];
  
  // Flag indicating message was edited
  edited?: boolean;
  
  // Whether to allow Markdown rendering
  allow_markdown?: boolean;
  
  // Processing state: "partial" | "complete" | "error"
  state?: string;
  
  // User feedback: true (positive), false (negative), null (none)
  positive_feedback?: boolean | null;
};
```

### 3. Content Block Schema

```typescript
export interface ContentBlock {
  // Human-readable title for the content block
  title: string;
  
  // Array of different content types within this block
  contents: ContentType[];
  
  // Whether Markdown rendering is allowed
  allow_markdown: boolean;
  
  // Associated media URLs
  media_url?: string[];
  
  // Component identifier that created this block
  component: string;
}
```

### 4. Content Type Schemas

#### Base Content Interface
```typescript
export interface BaseContent {
  // Content type identifier
  type: string;
  
  // Processing duration in milliseconds
  duration?: number;
  
  // Optional header information
  header?: {
    title?: string;
    icon?: string;
  };
}
```

#### Text Content
```typescript
export interface TextContent extends BaseContent {
  type: "text";
  // Markdown-compatible text content
  text: string;
}
```

#### Code Content
```typescript
export interface CodeContent extends BaseContent {
  type: "code";
  // Source code string
  code: string;
  // Programming language identifier (e.g., "python", "javascript")
  language: string;
  // Optional title for code block
  title?: string;
}
```

#### JSON Content
```typescript
export interface JSONContent extends BaseContent {
  type: "json";
  // Any valid JSON data structure
  data: Record<string, any>;
}
```

#### Media Content
```typescript
export interface MediaContent extends BaseContent {
  type: "media";
  // Array of media URLs (images, videos, etc.)
  urls: string[];
  // Optional caption for media
  caption?: string;
}
```

#### Tool Content
```typescript
export interface ToolContent extends BaseContent {
  type: "tool_use";
  // Tool name identifier
  name?: string;
  // Input parameters passed to the tool
  tool_input: Record<string, any>;
  // Tool execution output (any format)
  output?: any;
  // Error information if tool execution failed
  error?: any;
}
```

#### Error Content
```typescript
export interface ErrorContent extends BaseContent {
  type: "error";
  // Component that generated the error
  component?: string;
  // Field that caused the error
  field?: string;
  // Human-readable error reason
  reason?: string;
  // Suggested solution or fix
  solution?: string;
  // Full error traceback/stack trace
  traceback?: string;
}
```

### 5. Backend Message Schema

```typescript
// Message as received from backend API
export interface MessageResponse {
  id: string;
  flow_id: string;
  timestamp: string; // ISO datetime
  sender: "User" | "Machine";
  sender_name: string;
  session_id: string;
  text: string;
  files: string; // JSON stringified array
  edit: boolean;
  background_color?: string;
  text_color?: string;
  category?: string;
  properties?: string; // JSON stringified object
  content_blocks?: string; // JSON stringified array
}
```

### 6. File Handling Schemas

```typescript
// File preview during upload
export interface FilePreviewType {
  file: File;
  loading: boolean;
  error: boolean;
  id: string;
  type: string; // "image", "document", etc.
  path?: string; // Set after successful upload
}

// File upload response
export interface UploadFileResponse {
  flow_id: string;
  file_path: string;
}
```

## Message Processing Pipeline

### 1. Backend Data Transformation

The raw backend data must be transformed into the frontend format:

```typescript
function transformBackendMessage(backendMessage: MessageResponse): ChatMessageType {
  // Parse files field
  let files = [];
  if (backendMessage.files) {
    if (Array.isArray(backendMessage.files)) {
      files = backendMessage.files;
    } else if (backendMessage.files === "[]" || backendMessage.files === "") {
      files = [];
    } else if (typeof backendMessage.files === "string") {
      try {
        files = JSON.parse(backendMessage.files);
      } catch (error) {
        console.error("Error parsing files:", error);
        files = [];
      }
    }
  }

  // Parse properties
  let properties = {};
  if (backendMessage.properties) {
    if (typeof backendMessage.properties === "string") {
      try {
        properties = JSON.parse(backendMessage.properties);
      } catch (error) {
        console.error("Error parsing properties:", error);
        properties = {};
      }
    } else {
      properties = backendMessage.properties;
    }
  }

  // Parse content blocks
  let content_blocks = [];
  if (backendMessage.content_blocks) {
    if (typeof backendMessage.content_blocks === "string") {
      try {
        content_blocks = JSON.parse(backendMessage.content_blocks);
      } catch (error) {
        console.error("Error parsing content_blocks:", error);
        content_blocks = [];
      }
    } else if (Array.isArray(backendMessage.content_blocks)) {
      content_blocks = backendMessage.content_blocks;
    }
  }

  return {
    isSend: backendMessage.sender === "User",
    message: backendMessage.text,
    sender_name: backendMessage.sender_name,
    files: files,
    id: backendMessage.id,
    timestamp: backendMessage.timestamp,
    session: backendMessage.session_id,
    edit: backendMessage.edit,
    background_color: backendMessage.background_color || "",
    text_color: backendMessage.text_color || "",
    content_blocks: content_blocks,
    category: backendMessage.category || "message",
    properties: properties,
  };
}
```

### 2. Message Filtering and Sorting

```typescript
function processMessages(
  rawMessages: MessageResponse[],
  currentFlowId: string,
  visibleSession: string | null
): ChatMessageType[] {
  const transformedMessages = rawMessages
    .filter(message => 
      message.flow_id === currentFlowId &&
      (visibleSession === message.session_id || visibleSession === null)
    )
    .map(transformBackendMessage);

  // Sort by timestamp
  return transformedMessages.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
}
```

## State Management

### 1. Messages Store Implementation

```typescript
interface MessagesStoreType {
  messages: MessageResponse[];
  displayLoadingMessage: boolean;
  
  // Core operations
  setMessages: (messages: MessageResponse[]) => void;
  addMessage: (message: MessageResponse) => void;
  removeMessage: (message: MessageResponse) => void;
  updateMessage: (message: MessageResponse) => void;
  updateMessagePartial: (message: Partial<MessageResponse>) => void;
  
  // Streaming support
  updateMessageText: (id: string, chunk: string) => void;
  
  // Bulk operations
  clearMessages: () => void;
  removeMessages: (ids: string[]) => void;
  deleteSession: (id: string) => void;
}

// Implementation using Zustand
const useMessagesStore = create<MessagesStoreType>((set, get) => ({
  displayLoadingMessage: false,
  messages: [],
  
  setMessages: (messages) => {
    set(() => ({ messages }));
  },
  
  addMessage: (message) => {
    const existingMessage = get().messages.find(msg => msg.id === message.id);
    if (existingMessage) {
      get().updateMessagePartial(message);
      return;
    }
    
    if (message.sender === "Machine") {
      set(() => ({ displayLoadingMessage: false }));
    }
    
    set(() => ({ messages: [...get().messages, message] }));
  },
  
  updateMessage: (message) => {
    set(() => ({
      messages: get().messages.map(msg =>
        msg.id === message.id ? message : msg
      ),
    }));
  },
  
  updateMessagePartial: (message) => {
    set((state) => {
      const updatedMessages = [...state.messages];
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].id === message.id) {
          updatedMessages[i] = { ...updatedMessages[i], ...message };
          break;
        }
      }
      return { messages: updatedMessages };
    });
  },
  
  updateMessageText: (id, chunk) => {
    set((state) => {
      const updatedMessages = [...state.messages];
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].id === id) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            text: updatedMessages[i].text + chunk,
          };
          break;
        }
      }
      return { messages: updatedMessages };
    });
  },
  
  removeMessages: (ids) => {
    return new Promise((resolve, reject) => {
      try {
        set((state) => {
          const updatedMessages = state.messages.filter(
            msg => !ids.includes(msg.id)
          );
          resolve(updatedMessages);
          return { messages: updatedMessages };
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  deleteSession: (id) => {
    set((state) => {
      const updatedMessages = state.messages.filter(
        msg => msg.session_id !== id
      );
      return { messages: updatedMessages };
    });
  },
  
  clearMessages: () => {
    set(() => ({ messages: [] }));
  },
}));
```

## Component Architecture

### 1. Main Chat View Component

```typescript
interface ChatViewProps {
  sendMessage: ({ repeat, files }: { repeat: number; files?: string[] }) => void;
  visibleSession: string | null;
  focusChat: boolean;
  closeChat?: () => void;
  playgroundPage?: boolean;
  sidebarOpen?: boolean;
}

function ChatView({
  sendMessage,
  visibleSession,
  focusChat,
  closeChat,
  playgroundPage,
  sidebarOpen,
}: ChatViewProps) {
  // State management
  const messages = useMessagesStore(state => state.messages);
  const displayLoadingMessage = useMessagesStore(state => state.displayLoadingMessage);
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [files, setFiles] = useState<FilePreviewType[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for DOM manipulation
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  
  // Process messages when they change
  useEffect(() => {
    const processedMessages = processMessages(messages, currentFlowId, visibleSession);
    setChatHistory(processedMessages);
  }, [messages, visibleSession]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  // Message update handler
  function updateChat(chat: ChatMessageType, message: string, stream_url?: string) {
    chat.message = message;
    // Additional update logic...
  }
  
  // File handling
  const { handleFiles } = useFileHandler(currentFlowId);
  
  // Drag and drop
  const { dragOver, dragEnter, dragLeave } = useDragAndDrop(setIsDragging, !!playgroundPage);
  
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
    setIsDragging(false);
  };
  
  return (
    <div 
      className="flex h-full w-full flex-col rounded-md"
      onDragOver={dragOver}
      onDragEnter={dragEnter}
      onDragLeave={dragLeave}
      onDrop={onDrop}
    >
      {/* Messages container */}
      <div ref={messagesRef} className="chat-message-div">
        {chatHistory.length > 0 ? (
          chatHistory.map((chat, index) => (
            <MemoizedChatMessage
              key={`${chat.id}-${index}`}
              chat={chat}
              lastMessage={chatHistory.length - 1 === index}
              updateChat={updateChat}
              closeChat={closeChat}
              playgroundPage={playgroundPage}
            />
          ))
        ) : (
          <EmptyStateView />
        )}
        
        {/* Loading indicator */}
        {displayLoadingMessage && <LoadingMessage />}
      </div>
      
      {/* Input area */}
      <div className="m-auto w-full max-w-[768px] md:w-5/6">
        <ChatInput
          sendMessage={sendMessage}
          inputRef={inputRef}
          files={files}
          setFiles={setFiles}
          isDragging={isDragging}
          playgroundPage={!!playgroundPage}
        />
      </div>
    </div>
  );
}
```

### 2. Individual Message Component

```typescript
interface ChatMessageProps {
  chat: ChatMessageType;
  lastMessage: boolean;
  updateChat: (chat: ChatMessageType, message: string, stream_url?: string) => void;
  closeChat?: () => void;
  playgroundPage?: boolean;
}

function ChatMessage({
  chat,
  lastMessage,
  updateChat,
  closeChat,
  playgroundPage,
}: ChatMessageProps) {
  // State for message-specific functionality
  const [isStreaming, setIsStreaming] = useState(false);
  const [editMessage, setEditMessage] = useState(false);
  const [showError, setShowError] = useState(false);
  const [chatMessage, setChatMessage] = useState(
    chat.message ? chat.message.toString() : ""
  );
  
  // Streaming implementation
  const eventSource = useRef<EventSource | undefined>(undefined);
  
  useEffect(() => {
    if (chat.stream_url && !isStreaming) {
      streamChunks(chat.stream_url);
    }
  }, [chat.stream_url]);
  
  const streamChunks = (url: string) => {
    setIsStreaming(true);
    return new Promise<boolean>((resolve, reject) => {
      eventSource.current = new EventSource(url);
      
      eventSource.current.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        if (parsedData.chunk) {
          setChatMessage(prev => prev + parsedData.chunk);
        }
      };
      
      eventSource.current.onerror = (event: any) => {
        setIsStreaming(false);
        eventSource.current?.close();
        reject(new Error("Streaming failed"));
      };
      
      eventSource.current.addEventListener("close", () => {
        eventSource.current?.close();
        setIsStreaming(false);
        resolve(true);
      });
    });
  };
  
  // Message categorization rendering
  if (chat.category === "error") {
    return (
      <ErrorView
        blocks={chat.content_blocks ?? []}
        showError={showError}
        lastMessage={lastMessage}
        closeChat={closeChat}
        chat={chat}
      />
    );
  }
  
  // Regular message rendering
  return (
    <div className="message-container">
      {/* Avatar */}
      <div className="message-avatar">
        {chat.isSend ? <UserAvatar /> : <AIAvatar />}
      </div>
      
      {/* Message content */}
      <div className="message-content">
        {/* Sender name */}
        <div className="sender-name" style={{ color: chat.properties?.text_color }}>
          {chat.sender_name}
          {chat.category === "audio" && <MicrophoneIcon />}
        </div>
        
        {/* Content blocks */}
        {chat.content_blocks && chat.content_blocks.length > 0 && (
          <ContentBlockDisplay
            contentBlocks={chat.content_blocks}
            isLoading={chat.properties?.state === "partial" && lastMessage}
            state={chat.properties?.state}
            chatId={chat.id}
            playgroundPage={playgroundPage}
          />
        )}
        
        {/* Main message text */}
        {!editMessage ? (
          <MessageContent
            message={chatMessage}
            isEmpty={!chatMessage.trim()}
            isAudioMessage={chat.category === "audio"}
            editedFlag={chat.edit}
          />
        ) : (
          <EditMessageField
            message={chatMessage}
            onEdit={handleEditMessage}
            onCancel={() => setEditMessage(false)}
          />
        )}
        
        {/* File attachments */}
        {chat.files && chat.files.length > 0 && (
          <div className="file-attachments">
            {chat.files.map((file, index) => (
              <FileCardWrapper key={index} index={index} path={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Content Rendering System

### 1. Content Block Display Component

```typescript
interface ContentBlockDisplayProps {
  contentBlocks: ContentBlock[];
  isLoading?: boolean;
  state?: string;
  chatId: string;
  playgroundPage?: boolean;
}

function ContentBlockDisplay({
  contentBlocks,
  isLoading,
  state,
  chatId,
  playgroundPage,
}: ContentBlockDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!contentBlocks?.length) return null;
  
  // Determine header based on state
  const lastContent = contentBlocks[0]?.contents[contentBlocks[0]?.contents.length - 1];
  const headerIcon = state === "partial" 
    ? lastContent?.header?.icon || "Bot" 
    : "Check";
  const headerTitle = state === "partial" 
    ? (lastContent?.header?.title ?? "Steps") 
    : "Finished";
  
  return (
    <div className="content-blocks-container">
      <div className="content-blocks-wrapper">
        {isLoading && <LoadingBorderAnimation />}
        
        {/* Header */}
        <div 
          className="content-blocks-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="header-left">
            <Icon name={headerIcon} className={state !== "partial" ? "success" : ""} />
            <span className="header-title">{headerTitle}</span>
          </div>
          <div className="header-right">
            <DurationDisplay duration={totalDuration} chatId={chatId} />
            <ChevronIcon expanded={isExpanded} />
          </div>
        </div>
        
        {/* Expandable content */}
        {isExpanded && (
          <div className="content-blocks-body">
            {contentBlocks.map((block, index) => (
              <div key={`${block.title}-${index}`} className="content-block">
                {/* Block title (only for partial state) */}
                {state === "partial" && (
                  <div className="block-title">
                    <MarkdownRenderer>{block.title}</MarkdownRenderer>
                  </div>
                )}
                
                {/* Block contents */}
                <div className="block-contents">
                  {block.contents.map((content, contentIndex) => (
                    <div key={contentIndex}>
                      {contentIndex > 0 && <Separator />}
                      <ContentDisplay
                        content={content}
                        chatId={`${chatId}-${contentIndex}`}
                        playgroundPage={playgroundPage}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Individual Content Display Component

```typescript
interface ContentDisplayProps {
  content: ContentType;
  chatId: string;
  playgroundPage?: boolean;
}

function ContentDisplay({ content, chatId, playgroundPage }: ContentDisplayProps) {
  // Render header if present
  const renderHeader = content.header && (
    <div className="content-header">
      {content.header.icon && <Icon name={content.header.icon} />}
      {content.header.title && (
        <MarkdownRenderer className="header-title">
          {content.header.title}
        </MarkdownRenderer>
      )}
    </div>
  );
  
  // Render duration if present
  const renderDuration = content.duration !== undefined && !playgroundPage && (
    <div className="content-duration">
      <DurationDisplay duration={content.duration} chatId={chatId} />
    </div>
  );
  
  // Render content based on type
  let contentData: ReactNode | null = null;
  
  switch (content.type) {
    case "text":
      contentData = (
        <div className="text-content">
          <MarkdownRenderer
            className="prose"
            components={{
              p: ({ children }) => <span className="text-block">{children}</span>,
              pre: ({ children }) => <>{children}</>,
              code: ({ inline, className, children }) => {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";
                
                return !inline ? (
                  <CodeBlock language={language} code={String(children)} />
                ) : (
                  <code className={className}>{children}</code>
                );
              },
            }}
          >
            {content.text}
          </MarkdownRenderer>
        </div>
      );
      break;
      
    case "code":
      contentData = (
        <div className="code-content">
          <CodeBlock language={content.language} code={content.code} />
        </div>
      );
      break;
      
    case "json":
      contentData = (
        <div className="json-content">
          <CodeBlock 
            language="json" 
            code={JSON.stringify(content.data, null, 2)} 
          />
        </div>
      );
      break;
      
    case "error":
      contentData = (
        <div className="error-content">
          {content.reason && <div className="error-reason">Reason: {content.reason}</div>}
          {content.solution && <div className="error-solution">Solution: {content.solution}</div>}
          {content.traceback && (
            <CodeBlock language="text" code={content.traceback} />
          )}
        </div>
      );
      break;
      
    case "tool_use":
      contentData = (
        <div className="tool-content">
          <MarkdownRenderer>**Input:**</MarkdownRenderer>
          <CodeBlock 
            language="json" 
            code={JSON.stringify(content.tool_input, null, 2)} 
          />
          
          {content.output && (
            <>
              <MarkdownRenderer>**Output:**</MarkdownRenderer>
              <div className="tool-output">
                {formatToolOutput(content.output)}
              </div>
            </>
          )}
          
          {content.error && (
            <div className="tool-error">
              <MarkdownRenderer>**Error:**</MarkdownRenderer>
              <CodeBlock 
                language="json" 
                code={JSON.stringify(content.error, null, 2)} 
              />
            </div>
          )}
        </div>
      );
      break;
      
    case "media":
      contentData = (
        <div className="media-content">
          {content.urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={content.caption || `Media ${index}`}
              className="media-item"
            />
          ))}
          {content.caption && (
            <div className="media-caption">{content.caption}</div>
          )}
        </div>
      );
      break;
  }
  
  return (
    <div className="content-display">
      {renderHeader}
      {renderDuration}
      {contentData}
    </div>
  );
}

// Helper function for tool output formatting
function formatToolOutput(output: any): ReactNode {
  if (output === null || output === undefined) return "";
  
  if (typeof output === "string") {
    return (
      <MarkdownRenderer
        components={{
          code: ({ inline, className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <CodeBlock 
                language={match ? match[1] : ""} 
                code={String(children)} 
              />
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {output}
      </MarkdownRenderer>
    );
  }
  
  try {
    return (
      <CodeBlock 
        language="json" 
        code={JSON.stringify(output, null, 2)} 
      />
    );
  } catch {
    return String(output);
  }
}
```

## File Handling System

### 1. File Upload Handler

```typescript
interface FileHandlerOptions {
  currentFlowId: string;
  maxFileSize: number;
  allowedExtensions: string[];
}

function useFileHandler({ currentFlowId, maxFileSize, allowedExtensions }: FileHandlerOptions) {
  const [files, setFiles] = useState<FilePreviewType[]>([]);
  const { mutate: uploadFile } = useUploadFileMutation();
  
  const handleFiles = (uploadedFiles: FileList) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    const file = uploadedFiles[0];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    // Validate file size
    if (file.size > maxFileSize) {
      showError(`File size exceeds ${formatFileSize(maxFileSize)} limit`);
      return;
    }
    
    // Validate file type
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      showError(`File type .${fileExtension} not supported`);
      return;
    }
    
    // Create preview entry
    const fileId = generateUniqueId();
    const fileType = file.type.split("/")[0];
    
    setFiles(prevFiles => [
      ...prevFiles,
      {
        file,
        loading: true,
        error: false,
        id: fileId,
        type: fileType,
      }
    ]);
    
    // Upload file
    uploadFile(
      { file, id: currentFlowId },
      {
        onSuccess: (data) => {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, loading: false, path: data.file_path }
                : f
            )
          );
        },
        onError: (error) => {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, loading: false, error: true }
                : f
            )
          );
          showError(`Upload failed: ${error.message}`);
        },
      }
    );
  };
  
  return { files, setFiles, handleFiles };
}
```

### 2. File Display Components

```typescript
// File card wrapper for message display
function FileCardWrapper({ 
  index, 
  path 
}: { 
  index: number; 
  path: { path: string; type: string; name: string } | string; 
}) {
  const [show, setShow] = useState(true);
  
  // Parse path data
  let name: string, type: string, pathString: string;
  
  if (typeof path === "string") {
    name = path.split("/").pop() || "";
    type = path.split(".").pop() || "";
    pathString = path;
  } else {
    name = path.name;
    type = path.type;
    pathString = path.path;
  }
  
  return (
    <div className="file-card-wrapper">
      <div 
        className="file-header"
        onClick={() => setShow(!show)}
      >
        <span className="file-name">{formatFileName(name, 50)}</span>
        <Icon name={show ? "ChevronDown" : "ChevronRight"} />
      </div>
      
      <FileCard
        showFile={show}
        fileName={name}
        fileType={type}
        path={pathString}
      />
    </div>
  );
}

// File preview during upload
function FilePreview({
  error,
  file,
  loading,
  onDelete,
}: {
  loading: boolean;
  file: File;
  error: boolean;
  onDelete: () => void;
}) {
  const fileType = file.type.toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "bmp", "webp"].some(type => 
    fileType.includes(type)
  );
  
  return (
    <div className="file-preview">
      {loading ? (
        <div className="file-loading">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="file-error">
          <Icon name="AlertCircle" />
          <span>Upload failed</span>
        </div>
      ) : isImage ? (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="file-image-preview"
        />
      ) : (
        <div className="file-document-preview">
          <Icon name="File" />
          <span>{file.name}</span>
        </div>
      )}
      
      <button
        onClick={onDelete}
        className="file-delete-button"
      >
        <Icon name="X" />
      </button>
    </div>
  );
}
```

### 3. Drag and Drop Implementation

```typescript
function useDragAndDrop(
  setIsDragging: (dragging: boolean) => void,
  playgroundPage: boolean
) {
  const dragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.types.some(type => type === "Files")) {
      setIsDragging(true);
    }
  };
  
  const dragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.types.some(type => type === "Files")) {
      setIsDragging(true);
    }
  };
  
  const dragLeave = (e: DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  
  return { dragOver, dragEnter, dragLeave };
}
```

## Streaming Implementation

### 1. Server-Sent Events Handler

```typescript
function useMessageStreaming() {
  const updateMessageText = useMessagesStore(state => state.updateMessageText);
  
  const streamChunks = (url: string, messageId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (parsedData.chunk) {
            updateMessageText(messageId, parsedData.chunk);
          }
        } catch (error) {
          console.error("Error parsing streaming data:", error);
        }
      };
      
      eventSource.onerror = (event: any) => {
        eventSource.close();
        
        try {
          const errorData = JSON.parse(event.data);
          if (errorData?.error) {
            reject(new Error(errorData.error));
          }
        } catch {
          reject(new Error("Streaming connection failed"));
        }
      };
      
      eventSource.addEventListener("close", () => {
        eventSource.close();
        resolve(true);
      });
      
      // Cleanup function
      return () => {
        eventSource.close();
      };
    });
  };
  
  return { streamChunks };
}
```

### 2. Partial State Updates

```typescript
function handlePartialUpdates(message: ChatMessageType) {
  const isPartial = message.properties?.state === "partial";
  const isComplete = message.properties?.state === "complete";
  
  if (isPartial) {
    // Show loading indicators
    // Update content blocks in real-time
    // Display current step information
    return {
      showLoading: true,
      headerIcon: "Bot",
      headerTitle: "Steps",
      showBlockTitle: true,
    };
  }
  
  if (isComplete) {
    // Hide loading indicators
    // Show completion state
    return {
      showLoading: false,
      headerIcon: "Check",
      headerTitle: "Finished",
      showBlockTitle: false,
    };
  }
  
  return {
    showLoading: false,
    headerIcon: "Bot",
    headerTitle: "Response",
    showBlockTitle: false,
  };
}
```

## UI Components Specifications

### 1. Styling Classes and Structure

```css
/* Main chat container */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 0.375rem;
}

/* Messages area */
.chat-message-div {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  scroll-behavior: smooth;
}

/* Individual message */
.message-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  max-width: 768px;
  width: 83.333333%;
  word-break: break-word;
}

.message-container.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-container.ai {
  flex-direction: row;
}

/* Message avatar */
.message-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Message content */
.message-content {
  flex: 1;
  min-width: 0;
}

.sender-name {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Content blocks */
.content-blocks-container {
  margin: 0.75rem 0;
}

.content-blocks-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--background-color);
  overflow: hidden;
  position: relative;
}

.content-blocks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-color);
}

.content-blocks-body {
  padding: 0;
}

.content-block {
  position: relative;
}

.content-block:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.block-title {
  padding: 1rem 1rem 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.block-contents {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* Content display */
.content-display {
  position: relative;
  padding: 1rem;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.content-duration {
  position: absolute;
  top: 1rem;
  right: 0.5rem;
}

/* Text content */
.text-content {
  margin-left: 0.25rem;
  padding-right: 5rem;
}

.text-content .prose {
  max-width: 100%;
  font-size: 0.875rem;
  font-weight: 400;
}

.text-block {
  display: block;
  width: fit-content;
  max-width: 100%;
}

/* Code content */
.code-content,
.json-content {
  padding-right: 5rem;
}

/* Error content */
.error-content {
  color: var(--error-color);
}

.error-reason,
.error-solution {
  margin-bottom: 0.5rem;
}

/* Tool content */
.tool-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-output {
  margin-top: 0.25rem;
}

.tool-error {
  color: var(--error-color);
}

/* Media content */
.media-content img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
}

.media-caption {
  margin-top: 0.5rem;
  font-style: italic;
  color: var(--muted-foreground);
}

/* File attachments */
.file-attachments {
  margin: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.file-card-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

/* Loading states */
.loading-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
  animation: loading-border 10s linear infinite;
}

@keyframes loading-border {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.loading-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.loading-text {
  animation: shimmer 1s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Input area */
.chat-input-container {
  margin: 0 auto;
  width: 100%;
  max-width: 768px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--input-border);
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: var(--background-color);
}

.input-wrapper:hover {
  border-color: var(--muted-foreground);
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  border-width: 1.75px;
}

.text-input {
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  line-height: 1.25rem;
  min-height: 1.25rem;
  max-height: 12rem;
}

/* File previews */
.file-preview-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  overflow-x: auto;
}

.file-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--background-color);
  flex-shrink: 0;
}

.file-image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.375rem;
}

.file-delete-button {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background-color: var(--error-color);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Drag and drop */
.drag-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--primary-color-rgb), 0.1);
  border: 2px dashed var(--primary-color);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 600;
```css
  color: var(--primary-color);
  z-index: 10;
}

/* Responsive design */
@media (max-width: 768px) {
  .message-container {
    width: 100%;
    max-width: 100%;
  }
  
  .content-display {
    padding: 0.75rem;
  }
  
  .text-content {
    padding-right: 2rem;
  }
  
  .code-content,
  .json-content {
    padding-right: 2rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --background-color: #0f0f0f;
    --foreground-color: #fafafa;
    --muted-foreground: #a1a1aa;
    --border-color: #27272a;
    --input-border: #3f3f46;
    --primary-color: #3b82f6;
    --primary-color-rgb: 59, 130, 246;
    --error-color: #ef4444;
  }
}

/* Light mode */
@media (prefers-color-scheme: light) {
  :root {
    --background-color: #ffffff;
    --foreground-color: #0a0a0a;
    --muted-foreground: #71717a;
    --border-color: #e4e4e7;
    --input-border: #d4d4d8;
    --primary-color: #2563eb;
    --primary-color-rgb: 37, 99, 235;
    --error-color: #dc2626;
  }
}
```

### 2. Component Props Interfaces

```typescript
// Complete props for all major components
interface ChatViewProps {
  sendMessage: ({ repeat, files }: { repeat: number; files?: string[] }) => void;
  visibleSession: string | null;
  focusChat: boolean;
  closeChat?: () => void;
  playgroundPage?: boolean;
  sidebarOpen?: boolean;
}

interface ChatMessageProps {
  chat: ChatMessageType;
  lastMessage: boolean;
  updateChat: (chat: ChatMessageType, message: string, stream_url?: string) => void;
  closeChat?: () => void;
  playgroundPage?: boolean;
}

interface ContentBlockDisplayProps {
  contentBlocks: ContentBlock[];
  isLoading?: boolean;
  state?: string;
  chatId: string;
  playgroundPage?: boolean;
}

interface ContentDisplayProps {
  content: ContentType;
  chatId: string;
  playgroundPage?: boolean;
}

interface ChatInputProps {
  sendMessage: ({ repeat, files }: { repeat: number; files?: string[] }) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  noInput: boolean;
  files: FilePreviewType[];
  setFiles: React.Dispatch<React.SetStateAction<FilePreviewType[]>>;
  isDragging: boolean;
  playgroundPage: boolean;
}

interface FileCardWrapperProps {
  index: number;
  path: { path: string; type: string; name: string } | string;
}

interface FilePreviewProps {
  error: boolean;
  file: File;
  loading: boolean;
  onDelete: () => void;
}

interface ErrorViewProps {
  blocks: ContentBlock[];
  showError: boolean;
  lastMessage: boolean;
  closeChat?: () => void;
  fitViewNode?: (id: string) => void;
  chat: ChatMessageType;
}
```

## Backend Integration

### 1. API Endpoints Specification

```typescript
// Messages API
interface MessagesAPI {
  // Get messages for a flow
  getMessages(params: {
    flow_id?: string;
    session_id?: string;
    sender?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageResponse[]>;
  
  // Update a message
  updateMessage(id: string, message: Partial<MessageResponse>): Promise<MessageResponse>;
  
  // Delete messages
  deleteMessages(ids: string[]): Promise<void>;
  
  // Update session name
  updateSessionName(oldSessionId: string, newSessionId: string): Promise<MessageResponse[]>;
}

// Files API
interface FilesAPI {
  // Upload file
  uploadFile(file: File, flowId: string): Promise<UploadFileResponse>;
  
  // Get file
  getFile(flowId: string, fileName: string): Promise<Blob>;
  
  // Delete file
  deleteFile(flowId: string, fileName: string): Promise<void>;
}

// Streaming API
interface StreamingAPI {
  // Create streaming connection
  createStream(url: string): EventSource;
  
  // Handle streaming events
  onStreamMessage(callback: (data: any) => void): void;
  onStreamError(callback: (error: any) => void): void;
  onStreamClose(callback: () => void): void;
}
```

### 2. API Client Implementation

```typescript
class ChatAPIClient {
  private baseURL: string;
  private headers: Record<string, string>;
  
  constructor(baseURL: string, authToken?: string) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
  }
  
  // Messages
  async getMessages(params: Record<string, any> = {}): Promise<MessageResponse[]> {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/messages?${queryParams}`, {
      headers: this.headers,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }
  
  async updateMessage(id: string, message: Partial<MessageResponse>): Promise<MessageResponse> {
    const response = await fetch(`${this.baseURL}/messages/${id}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update message: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async deleteMessages(ids: string[]): Promise<void> {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify(ids),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete messages: ${response.statusText}`);
    }
  }
  
  // Files
  async uploadFile(file: File, flowId: string): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseURL}/files/upload/${flowId}`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
        ...Object.fromEntries(
          Object.entries(this.headers).filter(([key]) => key !== 'Content-Type')
        ),
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Streaming
  createEventSource(url: string): EventSource {
    return new EventSource(url);
  }
  
  async performStreamingRequest({
    method,
    url,
    body,
    onData,
    onError,
    onComplete,
  }: {
    method: string;
    url: string;
    body?: any;
    onData: (data: any) => void;
    onError: (error: any) => void;
    onComplete: () => void;
  }): Promise<void> {
    const controller = new AbortController();
    
    const response = await fetch(url, {
      method,
      headers: {
        ...this.headers,
        'Connection': 'close',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    
    if (!response.ok) {
      onError(new Error(`Request failed: ${response.statusText}`));
      return;
    }
    
    if (!response.body) {
      onComplete();
      return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              onData(data);
            } catch (e) {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          onData(data);
        } catch (e) {
          console.warn('Failed to parse final streaming data:', buffer);
        }
      }
      
      onComplete();
    } catch (error) {
      onError(error);
    }
  }
}
```

### 3. Data Synchronization

```typescript
// Real-time synchronization manager
class MessageSyncManager {
  private apiClient: ChatAPIClient;
  private messageStore: any; // Your store instance
  private pollingInterval: number = 5000;
  private activePolls: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(apiClient: ChatAPIClient, messageStore: any) {
    this.apiClient = apiClient;
    this.messageStore = messageStore;
  }
  
  // Start polling for new messages
  startPolling(flowId: string, sessionId?: string) {
    if (this.activePolls.has(flowId)) {
      this.stopPolling(flowId);
    }
    
    const poll = async () => {
      try {
        const messages = await this.apiClient.getMessages({
          flow_id: flowId,
          session_id: sessionId,
        });
        
        this.messageStore.setMessages(messages);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    // Initial fetch
    poll();
    
    // Set up interval
    const intervalId = setInterval(poll, this.pollingInterval);
    this.activePolls.set(flowId, intervalId);
  }
  
  // Stop polling
  stopPolling(flowId: string) {
    const intervalId = this.activePolls.get(flowId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activePolls.delete(flowId);
    }
  }
  
  // Optimistic update
  async optimisticUpdate(message: Partial<MessageResponse>) {
    // Update store immediately
    this.messageStore.updateMessagePartial(message);
    
    try {
      // Sync with backend
      if (message.id) {
        await this.apiClient.updateMessage(message.id, message);
      }
    } catch (error) {
      // Rollback on error
      console.error('Failed to sync message:', error);
      // Implement rollback logic
    }
  }
  
  // Handle real-time updates via WebSocket
  setupWebSocket(url: string) {
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'message_added':
            this.messageStore.addMessage(data.message);
            break;
          case 'message_updated':
            this.messageStore.updateMessage(data.message);
            break;
          case 'message_deleted':
            this.messageStore.removeMessage(data.message);
            break;
          case 'session_deleted':
            this.messageStore.deleteSession(data.session_id);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Implement reconnection logic
    };
    
    return ws;
  }
}
```

## Error Handling

### 1. Error Types and Handling

```typescript
// Error types
enum ChatErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  STREAMING_ERROR = 'STREAMING_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
}

interface ChatError {
  type: ChatErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

// Error handler
class ErrorHandler {
  private errorStore: any;
  
  constructor(errorStore: any) {
    this.errorStore = errorStore;
  }
  
  handleError(error: ChatError) {
    console.error('Chat error:', error);
    
    switch (error.type) {
      case ChatErrorType.NETWORK_ERROR:
        this.errorStore.setError({
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
          actions: ['Retry', 'Dismiss'],
        });
        break;
        
      case ChatErrorType.UPLOAD_ERROR:
        this.errorStore.setError({
          title: 'Upload Failed',
          message: error.message,
          actions: ['Try Again', 'Dismiss'],
        });
        break;
        
      case ChatErrorType.STREAMING_ERROR:
        this.errorStore.setError({
          title: 'Streaming Error',
          message: 'The real-time connection was interrupted.',
          actions: ['Reconnect', 'Dismiss'],
        });
        break;
        
      case ChatErrorType.VALIDATION_ERROR:
        this.errorStore.setError({
          title: 'Invalid Input',
          message: error.message,
          actions: ['Dismiss'],
        });
        break;
        
      default:
        this.errorStore.setError({
          title: 'Unexpected Error',
          message: 'Something went wrong. Please try again.',
          actions: ['Retry', 'Dismiss'],
        });
    }
  }
  
  // Specific error handlers
  handleFileUploadError(file: File, error: any) {
    this.handleError({
      type: ChatErrorType.UPLOAD_ERROR,
      message: `Failed to upload ${file.name}: ${error.message}`,
      details: { fileName: file.name, fileSize: file.size, error },
      timestamp: new Date(),
    });
  }
  
  handleStreamingError(url: string, error: any) {
    this.handleError({
      type: ChatErrorType.STREAMING_ERROR,
      message: `Streaming connection failed: ${error.message}`,
      details: { url, error },
      timestamp: new Date(),
    });
  }
  
  handleNetworkError(operation: string, error: any) {
    this.handleError({
      type: ChatErrorType.NETWORK_ERROR,
      message: `Network error during ${operation}: ${error.message}`,
      details: { operation, error },
      timestamp: new Date(),
    });
  }
}
```

### 2. Error Boundary Component

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChatErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat component error:', error, errorInfo);
    
    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }
  
  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Implement error logging
    console.error('Error logged:', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>The chat interface encountered an unexpected error.</p>
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Performance Optimizations

### 1. Memoization Strategies

```typescript
// Memoized message component
const MemoizedChatMessage = React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.chat.message === nextProps.chat.message &&
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.session === nextProps.chat.session &&
    prevProps.chat.content_blocks === nextProps.chat.content_blocks &&
    prevProps.chat.properties === nextProps.chat.properties &&
    prevProps.lastMessage === nextProps.lastMessage
  );
});

// Memoized content display
const MemoizedContentDisplay = React.memo(ContentDisplay, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.chatId === nextProps.chatId &&
    prevProps.playgroundPage === nextProps.playgroundPage
  );
});

// Virtualized message list for large conversations
import { FixedSizeList as List } from 'react-window';

interface VirtualizedMessageListProps {
  messages: ChatMessageType[];
  height: number;
  itemHeight: number;
}

function VirtualizedMessageList({ messages, height, itemHeight }: VirtualizedMessageListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MemoizedChatMessage
        chat={messages[index]}
        lastMessage={index === messages.length - 1}
        updateChat={() => {}}
      />
    </div>
  );
  
  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### 2. Lazy Loading and Code Splitting

```typescript
// Lazy load heavy components
const LazyCodeEditor = React.lazy(() => import('./CodeEditor'));
const LazyMediaViewer = React.lazy(() => import('./MediaViewer'));
const LazyFileViewer = React.lazy(() => import('./FileViewer'));

// Code splitting for content types
const ContentTypeRenderers = {
  text: React.lazy(() => import('./renderers/TextRenderer')),
  code: React.lazy(() => import('./renderers/CodeRenderer')),
  json: React.lazy(() => import('./renderers/JsonRenderer')),
  media: React.lazy(() => import('./renderers/MediaRenderer')),
  tool_use: React.lazy(() => import('./renderers/ToolRenderer')),
  error: React.lazy(() => import('./renderers/ErrorRenderer')),
};

function LazyContentDisplay({ content, ...props }: ContentDisplayProps) {
  const Renderer = ContentTypeRenderers[content.type];
  
  return (
    <React.Suspense fallback={<div className="content-loading">Loading...</div>}>
      <Renderer content={content} {...props} />
    </React.Suspense>
  );
}
```

### 3. Debouncing and Throttling

```typescript
// Debounced search/filter
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Throttled scroll handling
function useThrottledScroll(callback: () => void, delay: number) {
  const lastRun = useRef(Date.now());
  
  const throttledCallback = useCallback(() => {
    if (Date.now() - lastRun.current >= delay) {
      callback();
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
  
  return throttledCallback;
}

// Usage in chat component
function ChatView() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const handleScroll = useThrottledScroll(() => {
    // Handle scroll events
    console.log('Scrolled');
  }, 100);
  
  // Filter messages based on debounced search
  const filteredMessages = useMemo(() => {
    if (!debouncedSearchQuery) return messages;
    
    return messages.filter(message =>
      message.text.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [messages, debouncedSearchQuery]);
  
  return (
    <div onScroll={handleScroll}>
      {/* Chat content */}
    </div>
  );
}
```

## Implementation Checklist

### 1. Core Setup
- [ ] Set up project structure with TypeScript
- [ ] Install required dependencies (React, state management, styling)
- [ ] Configure build tools and development environment
- [ ] Set up testing framework

### 2. Data Layer
- [ ] Implement message store with state management
- [ ] Create API client for backend communication
- [ ] Set up data transformation utilities
- [ ] Implement error handling system
- [ ] Add data validation schemas

### 3. Core Components
- [ ] Build main ChatView component
- [ ] Create ChatMessage component with memoization
- [ ] Implement ContentBlockDisplay component
- [ ] Build ContentDisplay with all content types
- [ ] Create ChatInput component
- [ ] Add file handling components

### 4. Content Rendering
- [ ] Implement text content with Markdown support
- [ ] Add code syntax highlighting
- [ ] Create JSON viewer component
- [ ] Build media display component
- [ ] Implement tool execution display
- [ ] Add error content renderer

### 5. File System
- [ ] Set up file upload functionality
- [ ] Implement drag and drop support
- [ ] Add file preview components
- [ ] Create file validation system
- [ ] Build file display components

### 6. Real-time Features
- [ ] Implement Server-Sent Events for streaming
- [ ] Add WebSocket support for real-time updates
- [ ] Create partial state handling
- [ ] Build loading and progress indicators
- [ ] Add connection status management

### 7. UI/UX Features
- [ ] Implement responsive design
- [ ] Add dark/light mode support
- [ ] Create loading states and animations
- [ ] Build error boundaries and fallbacks
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

### 8. Advanced Features
- [ ] Implement message editing functionality
- [ ] Add session management
- [ ] Create search and filtering
- [ ] Build export functionality
- [ ] Add user feedback system

### 9. Performance
- [ ] Add component memoization
- [ ] Implement virtual scrolling for large lists
- [ ] Set up lazy loading for heavy components
- [ ] Add debouncing and throttling
- [ ] Optimize bundle size with code splitting

### 10. Testing
- [ ] Write unit tests for utilities and stores
- [ ] Create component tests with React Testing Library
- [ ] Add integration tests for API interactions
- [ ] Implement E2E tests for critical user flows
- [ ] Set up performance testing

### 11. Documentation
- [ ] Create API documentation
- [ ] Write component documentation
- [ ] Add usage examples
- [ ] Create troubleshooting guide
- [ ] Document deployment process

### 12. Deployment
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Add monitoring and logging
- [ ] Set up error tracking
- [ ] Create deployment scripts

## Additional Considerations

### 1. Accessibility
```typescript
// ARIA labels and roles
<div role="log" aria-live="polite" aria-label="Chat messages">
  {messages.map(message => (
    <div
      key={message.id}
      role="article"
      aria-label={`Message from ${message.sender_name}`}
      tabIndex={0}
    >
      {/* Message content */}
    </div>
  ))}
</div>

// Keyboard navigation
const handleKeyDown = (event: React.KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
      if (!event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
      break;
    case 'Escape':
      if (editMode) {
        setEditMode(false);
      }
      break;
  }
};
```

### 2. Internationalization
```typescript
// i18n setup
interface Messages {
  'chat.send': string;
  'chat.uploading': string;
  'chat.error': string;
  'chat.retry': string;
  // ... more messages
}

function useTranslation() {
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState<Messages>({});
  
  const t = (key: keyof Messages, params?: Record<string, string>) => {
    let message = messages[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        message = message.replace(`{${param}}`, value);
      });
    }
    
    return message;
  };
  
  return { t, locale, setLocale };
}
```

### 3. Security Considerations
```typescript
// Content sanitization
import DOMPurify from 'dompurify';

function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// File validation
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  return { valid: true };
}

// XSS protection
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

This comprehensive documentation provides everything needed to recreate the Langflow chat system. It includes complete data schemas, component specifications, implementation details, styling guidelines, and best practices for building a robust, scalable chat interface with rich content support.