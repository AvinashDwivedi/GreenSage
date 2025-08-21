import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../.env' });

let suggestionPanel: vscode.WebviewPanel | null = null;

let lastSelection: {
  uri: vscode.Uri;
  range: vscode.Range;
} | null = null;

function getLoadingView(): string {
  return `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<style>
			html, body {
			height: 100%;
			margin: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			font-family: sans-serif;
			}

			.loading-container {
			text-align: center;
			}

			.spinner {
			margin: 0 auto 20px;
			width: 50px;
			height: 50px;
			border: 5px solid var(--vscode-editorWidget-border, #ccc);
			border-top-color: var(--vscode-progressBar-background, #007acc);
			border-radius: 50%;
			animation: spin 1s linear infinite;
			}

			@keyframes spin {
			to { transform: rotate(360deg); }
			}

			h2 {
			color: var(--vscode-editor-foreground, #333);
			}

			body.vscode-dark {
			background-color: var(--vscode-editor-background, #1e1e1e);
			}

			body.vscode-light {
			background-color: var(--vscode-editor-background, #ffffff);
			}
		</style>
		</head>
		<body class="">
		<div class="loading-container">
			<div class="spinner"></div>
			<h2>Analyzing the code...</h2>
		</div>

		<script>
			const body = document.body;
			const theme = window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'vscode-dark'
			: 'vscode-light';
			body.classList.add(theme);
		</script>
		</body>
		</html>`;
		}


function updateSuggestionPanel(suggestion: any) {
  if (!suggestionPanel) return;
  suggestionPanel.webview.html = getWebviewContentWithReplace(suggestion);
}

export function activate(context: vscode.ExtensionContext) {
  const analyzeDisposable = vscode.commands.registerCommand(
    'greencode.analyzeSelectedCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage('No code selected.');
        return;
      }

      lastSelection = {
        uri: editor.document.uri,
        range: new vscode.Range(selection.start, selection.end)
      };

      // REUSE PANEL IF EXISTS
      if (suggestionPanel) {
        suggestionPanel.reveal(vscode.ViewColumn.Beside, true);
        suggestionPanel.webview.html = getLoadingView();
      } else {
        suggestionPanel = vscode.window.createWebviewPanel(
          'greensageSuggestions',
          'Green Suggestions',
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );
        suggestionPanel.webview.html = getLoadingView();

        // Attach message handler once
        suggestionPanel.webview.onDidReceiveMessage(async message => {
          if (message.command === 'replace') {
            if (!lastSelection) {
              vscode.window.showErrorMessage('No original selection stored to replace.');
              return;
            }

            const { uri, range } = lastSelection;

            const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());

            if (!editor) {
              vscode.window.showErrorMessage('Editor not visible. Please open the file to replace.');
              return;
            }

            editor.edit(editBuilder => {
              editBuilder.replace(range, lastSuggestion?.suggested_code ?? '');
            });
          }
        });

        // Clear reference when closed
        suggestionPanel.onDidDispose(() => {
          suggestionPanel = null;
        });
      }

      // Analyze code
      const suggestion = await analyzeWithOpenAI(selectedText);
      lastSuggestion = suggestion; // Save for use in replace
      updateSuggestionPanel(suggestion);
    }
  );

  context.subscriptions.push(analyzeDisposable);
}

let lastSuggestion: any = null; // store the latest suggestion for Replace button

function getWebviewContentWithReplace(data: any): string {
  return `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<style>
			body {
			font-family: var(--vscode-editor-font-family, monospace);
			font-size: var(--vscode-editor-font-size, 14px);
			color: var(--vscode-editor-foreground);
			background-color: var(--vscode-editor-background);
			padding: 1rem;
			}

			pre {
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			font-family: var(--vscode-editor-font-family, monospace);
			font-size: var(--vscode-editor-font-size, 14px);
			padding: 1rem;
			border: 1px solid var(--vscode-editorWidget-border, #ccc);
			border-radius: 5px;
			overflow-x: auto;
			}

			button {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 0.5rem 1rem;
			margin-top: 1rem;
			cursor: pointer;
			border-radius: 4px;
			font-family: var(--vscode-editor-font-family);
			}

			button:hover {
			background-color: var(--vscode-button-hoverBackground);
			}

			h2 {
			margin-top: 2rem;
			color: var(--vscode-editor-foreground);
			}
		</style>
		</head>
		<body>
		<h2>🌱 Reason</h2>
		<p>${escapeHtml(data.reason)}</p>

		<h2>🧾 Original Code</h2>
		<pre>${escapeHtml(data.original_code)}</pre>

		<h2>✅ Suggested Code</h2>
		<pre>${escapeHtml(data.suggested_code)}</pre>

		<button onclick="replaceInEditor()">Replace in Editor</button>

		<script>
			const vscode = acquireVsCodeApi();
			function replaceInEditor() {
			vscode.postMessage({ command: 'replace' });
			}
		</script>
		</body>
		</html>`;
		}


function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function analyzeWithOpenAI(code: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      original_code: code,
      suggested_code: code,
      reason: '❌ OpenAI API key not found. Make sure to define it in a .env file.'
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
				{
				role: 'system',
				content: `
				You are GreenSage, an intelligent, sustainability-focused coding assistant. Your mission is to suggest code improvements that are not only correct and efficient, but also **environmentally responsible**, adhering to the Green Software Foundation’s principles:
				- **Minimize carbon emissions** through software—abate rather than offset.
				- Optimize for **energy efficiency**, **carbon awareness**, and **hardware efficiency**.
				- Use measurable metrics: account for energy consumption (E), carbon intensity (I), embodied emissions (M), per functional unit (R), i.e., SCI = (E * I) + M per R.
				- Suggest practical patterns or optimizations (e.g., algorithmic improvements, lazy loading, caching, efficient data structures) that align with GSF’s green software patterns and standards.
				- Promote measurable, transparent improvements using existing SCI frameworks and Carbon Aware SDKs when possible.

				Respond **only in JSON** with keys:
				- "original_code": the unmodified snippet,
				- "suggested_code": improved version addressing sustainability and correctness,
				- "reason": articulate how your suggestion reduces energy or carbon and aligns with GSF principles.

				No other text outside the JSON.`
				},
				{
					role: 'user',
					content: `Analyze the following code for sustainable improvements, emphasizing energy efficiency, carbon awareness, and using GSF-aligned strategies:\n\n${code}\n\nReturn a JSON object.`
				}
	],
	temperature: 0.3
    })
  });

  if (!response.ok) {
    return {
      original_code: code,
      suggested_code: code,
      reason: `❌ OpenAI Error: ${response.statusText}`
    };
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parsed = {
      original_code: code,
      suggested_code: code,
      reason: '⚠️ Could not parse AI response as JSON. Check prompt or model output.'
    };
  }

  return parsed;
}

export function deactivate() {}
