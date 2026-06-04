// @ts-ignore
import { CreateMLCEngine, MLCEngine, type InitProgressCallback } from "@mlc-ai/web-llm";

export class AIService {
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private progressCallback?: (progressText: string) => void;

  public setProgressCallback(callback: (progressText: string) => void) {
    this.progressCallback = callback;
  }

  /**
   * Initializes the WebLLM engine with a specified model.
   * Note: The first time this is called, it might download the model.
   * 
   * @param modelId The ID of the model to load (default is Phi-3-mini, as it's lightweight and fast)
   * @param initProgressCallback Optional callback to track download/loading progress
   */
  async initialize(
    modelId: string = "Phi-3-mini-4k-instruct-q4f16_1-MLC",
    initProgressCallback?: InitProgressCallback
  ): Promise<void> {
    if (this.engine || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      this.engine = await CreateMLCEngine(modelId, { 
        initProgressCallback: (progress: any) => {
          if (this.progressCallback) {
            this.progressCallback(progress.text);
          }
          if (initProgressCallback) initProgressCallback(progress);
        }
      });
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generates a plausible name for an intermediate/association class connecting two other classes.
   * 
   * @param classNames An array of class names that are participating in the association
   * @param roles An optional array of role names to provide more context for the AI
   * @returns A plausible name for the intermediate class in PascalCase (e.g., 'Enrollment')
   */
  async generateIntermediateClassName(classNames: string[], roles: string[] = []): Promise<string> {
    if (!this.engine) {
      throw new Error("AI engine is not initialized. Call initialize() first.");
    }

    // Filter out empty or undefined role names
    const validRoles = roles.filter(r => r && r.trim() !== '');
    const rolesText = validRoles.length > 0 
      ? ` The roles of these entities in the connection are: '${validRoles.join("', '")}'.`
      : '';

    // Prompt designed to strictly limit the model's output to just the class name
    const prompt = `You are an expert software architect. Suggest a single, plausible name for an intermediate 
    class connecting the entities: ${classNames.join(', ')}.${rolesText} Return ONLY the class name in PascalCase, without any punctuation, 
    explanations, or additional text.
    DO NOT just Concaternate the Names
    DO NOT just Add the Word Association at the end
    your goal is to get a word that describes the possible ontological connection between the entities.
    YOUR ANSWER SHOULD JUST CONTAIN THE ONE WORD FOR THE CLASS IN PASCAL CASE`;

    const messages = [
      { role: "system" as const, content: "You are a helpful coding assistant that only outputs exactly what is requested." },
      { role: "user" as const, content: prompt }
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.3, // Keep temperature low for deterministic and straightforward naming
      max_tokens: 20
    });

    const content = reply.choices[0]?.message.content?.trim() || classNames.join('');
    
    // Sanitize the output to ensure it remains a valid PascalCase identifier
    return content;
  }
}

export const aiService = new AIService();