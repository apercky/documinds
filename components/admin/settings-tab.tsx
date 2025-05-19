"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface PromptTemplate {
  name: string;
  content: string;
}

export function SettingsTab() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      name: "Default Prompt",
      content: "You are a helpful AI assistant. {input}",
    },
  ]);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");

  const handleAddPrompt = () => {
    if (!newPromptName || !newPromptContent) return;

    setPrompts([
      ...prompts,
      {
        name: newPromptName,
        content: newPromptContent,
      },
    ]);

    setNewPromptName("");
    setNewPromptContent("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LangChain Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div key={index} className="p-4 border rounded">
                <h4 className="font-medium mb-2">{prompt.name}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {prompt.content}
                </p>
              </div>
            ))}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">Add New Prompt Template</h4>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Prompt Name"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <textarea
                  placeholder="Prompt Content"
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  className="w-full p-2 border rounded h-32"
                />
                <Button
                  onClick={handleAddPrompt}
                  disabled={!newPromptName || !newPromptContent}
                >
                  Add Prompt
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>
          Note: This is a placeholder for LangChain prompts management.
          Integration with a backend storage system will be needed for
          persistence.
        </p>
      </div>
    </div>
  );
}
